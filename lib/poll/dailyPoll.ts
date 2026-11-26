import "../zodJitless.ts";
import { z } from "zod";

import type { DailyQuestion } from "@/lib/content/schemas";
import { COUNTRY } from "@/lib/country";
import { MAX_WEEK, MIN_WEEK, getTrimester } from "@/lib/pregnancy";
import { PUBLISHED_DAILY_QUESTIONS } from "@/lib/seed/py/dailyQuestions";
import type { Trimester } from "@/lib/types";

// "Pregunta del día", the pure half: which question today is, how an answer
// becomes a count, and how counts become the bars she sees.
//
// ## Counting, with no new table
//
// An answer is ONE increment of the app's existing anonymous counter,
// `contentStats` (lib/server/stats.ts), under a synthetic content id
// `poll-<questionId>-<optionKey>`, carrying her pregnancy week exactly as a
// content view does. Everything `lib/stats/contentStats.ts` says about that
// table holds here unchanged: no user, no session, no device id, no IP, daily
// buckets. Her own answer (which button she tapped) stays on the device only,
// under `POLL_STORAGE_KEY`.
//
// ## Reading, with nothing about the reader
//
// The read side (`GET /api/v1/poll/<questionId>`) takes the question id and
// nothing else: no week, no trimester, no query string. It answers the counts
// for all three trimesters in one payload, the same for everybody, and the
// card picks her trimester on the device. Same reasoning as the "lo más leído"
// GET: one cache key per question, and no health datum in a URL.

/**
 * How many answers a question needs in her trimester before the card shows
 * how others answered. Under it she sees only a thank-you: three answers
 * shown as "67 %" would present two women's taps as what mamás think.
 * The owner may change this number; nothing else depends on its value.
 */
export const POLL_MIN_ANSWERS = 30;

/** Prefix of every poll counter id. Kept out of "lo más leído". */
export const POLL_ID_PREFIX = "poll-";

/** The counter id for one answer: `poll-nombre-pensado-a`. */
export function pollContentId(questionId: string, optionKey: string): string {
  return `${POLL_ID_PREFIX}${questionId}-${optionKey}`;
}

/** True for a counter id that belongs to the poll, not to a piece of content. */
export function isPollContentId(contentId: string): boolean {
  return contentId.startsWith(POLL_ID_PREFIX);
}

const BY_ID = new Map(PUBLISHED_DAILY_QUESTIONS.map((question) => [question.id, question]));

/** A published question, or `undefined`. */
export function findQuestion(questionId: string): DailyQuestion | undefined {
  return BY_ID.get(questionId);
}

/** True only for a question id and option key that are published together. */
export function isPublishedAnswer(questionId: string, optionKey: string): boolean {
  return findQuestion(questionId)?.options.some((option) => option.key === optionKey) ?? false;
}

/**
 * The POST body. `.strict()` for the same reason as `RecordViewSchema`: a field
 * nobody designed (a user id, a trimester, a free-text answer) is a 400 the
 * first time it is sent. The shapes are checked here; whether the pair is
 * published is checked by `isPublishedAnswer`.
 */
export const PollAnswerSchema = z
  .object({
    questionId: z.string().min(1).max(60).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    optionKey: z.string().regex(/^[a-z]$/),
    week: z.number().int().min(MIN_WEEK).max(MAX_WEEK).optional(),
  })
  .strict();
export type PollAnswer = z.infer<typeof PollAnswerSchema>;

const TRIMESTERS = [1, 2, 3] as const;

/** The GET's answer: counts per option, per trimester, summed over all days. */
export const PollResultsSchema = z
  .object({
    questionId: z.string(),
    trimesters: z
      .array(
        z
          .object({
            trimester: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            counts: z.record(z.string(), z.number().int().min(0)),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();
export type PollResults = z.infer<typeof PollResultsSchema>;

/**
 * Fold counter rows into the GET's payload. Pure, so the grouping is testable
 * without a MySQL. A row whose id is not one of this question's published
 * options is ignored (a removed option), and so is week 0, "no week": the card
 * only shows on the pregnancy home, so every real answer carries a week.
 */
export function tallyByTrimester(
  question: DailyQuestion,
  rows: readonly { contentId: string; week: number; views: number }[],
): PollResults {
  const keyById = new Map(
    question.options.map((option) => [pollContentId(question.id, option.key), option.key]),
  );
  const counts = new Map<Trimester, Record<string, number>>(
    TRIMESTERS.map((trimester) => [
      trimester,
      Object.fromEntries(question.options.map((option) => [option.key, 0])),
    ]),
  );
  for (const row of rows) {
    const key = keyById.get(row.contentId);
    if (!key || row.week < MIN_WEEK || row.week > MAX_WEEK) continue;
    const forTrimester = counts.get(getTrimester(row.week))!;
    forTrimester[key] = (forTrimester[key] ?? 0) + Math.max(0, Math.trunc(row.views));
  }
  return {
    questionId: question.id,
    trimesters: TRIMESTERS.map((trimester) => ({ trimester, counts: counts.get(trimester)! })),
  };
}

/** Her trimester's counts and their total, or zeros. */
export function countsFor(
  results: PollResults | null,
  trimester: Trimester,
): { counts: Record<string, number>; total: number } {
  const counts = results?.trimesters.find((entry) => entry.trimester === trimester)?.counts ?? {};
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return { counts, total };
}

/**
 * Whole percentages that add up to exactly 100 (largest remainder), so three
 * bars of 33 % never sit under a heading that says "así respondieron".
 * An empty total gives zeros.
 */
export function percentages(
  counts: Record<string, number>,
  keys: readonly string[],
): Record<string, number> {
  const total = keys.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  const out: Record<string, number> = Object.fromEntries(keys.map((key) => [key, 0]));
  if (total <= 0) return out;
  const exact = keys.map((key) => ({ key, value: ((counts[key] ?? 0) * 100) / total }));
  let assigned = 0;
  for (const entry of exact) {
    out[entry.key] = Math.floor(entry.value);
    assigned += out[entry.key]!;
  }
  const byRemainder = [...exact].sort(
    (a, b) => b.value - Math.floor(b.value) - (a.value - Math.floor(a.value)) || keys.indexOf(a.key) - keys.indexOf(b.key),
  );
  for (let i = 0; i < 100 - assigned; i += 1) {
    const entry = byRemainder[i % byRemainder.length]!;
    out[entry.key] = out[entry.key]! + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Which question today is
// ---------------------------------------------------------------------------

/** "YYYY-MM-DD" for `now` in the country's time zone (America/Asuncion). */
export function localDayKey(now: Date, timeZone: string = COUNTRY.timeZone): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * The same question for everybody on a given day, so answers accumulate on
 * one question at a time: the day's number since 1970 (in Asunción), modulo
 * the list. Walks the whole list before repeating one.
 */
export function questionForDay(
  now: Date = new Date(),
  questions: readonly DailyQuestion[] = PUBLISHED_DAILY_QUESTIONS,
): DailyQuestion | null {
  if (questions.length === 0) return null;
  const day = Math.floor(Date.parse(`${localDayKey(now)}T00:00:00Z`) / 86_400_000);
  return questions[((day % questions.length) + questions.length) % questions.length] ?? null;
}

// ---------------------------------------------------------------------------
// Her own answers (this device only)
// ---------------------------------------------------------------------------

/**
 * A map of question id to the option key she tapped. On this device only;
 * cleared by "Borrar todos mis datos" (`wipeAllData` in lib/db.ts).
 */
export const POLL_STORAGE_KEY = "mibebe.pregunta.respuestas";

export type PollAnswers = Record<string, string>;

/** Narrow whatever is stored to published question/option pairs. */
export function parseAnswers(raw: string | null): PollAnswers {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: PollAnswers = {};
    for (const [questionId, optionKey] of Object.entries(value)) {
      if (typeof optionKey === "string" && isPublishedAnswer(questionId, optionKey)) {
        out[questionId] = optionKey;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function readAnswers(): PollAnswers {
  try {
    return parseAnswers(window.localStorage.getItem(POLL_STORAGE_KEY));
  } catch {
    return {};
  }
}

/**
 * Keep her answer. One answer per question per device: a second call for the
 * same question changes nothing and returns `false`, so the caller never sends
 * a second count.
 */
export function saveAnswer(questionId: string, optionKey: string): boolean {
  if (!isPublishedAnswer(questionId, optionKey)) return false;
  const current = readAnswers();
  if (current[questionId] !== undefined) return false;
  try {
    window.localStorage.setItem(
      POLL_STORAGE_KEY,
      JSON.stringify({ ...current, [questionId]: optionKey }),
    );
  } catch {
    // Private mode: the answer lives for this visit only. It is still counted
    // once, because the card holds it in memory for the rest of the visit.
  }
  return true;
}
