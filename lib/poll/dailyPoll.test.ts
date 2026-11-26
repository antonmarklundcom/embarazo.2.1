import { describe, expect, it } from "vitest";

import {
  POLL_MIN_ANSWERS,
  POLL_STORAGE_KEY,
  PollAnswerSchema,
  PollResultsSchema,
  countsFor,
  isPollContentId,
  isPublishedAnswer,
  localDayKey,
  parseAnswers,
  percentages,
  pollContentId,
  questionForDay,
  tallyByTrimester,
} from "./dailyPoll";
import { PUBLISHED_DAILY_QUESTIONS } from "@/lib/seed/py/dailyQuestions";
import { ContentIdSchema } from "@/lib/stats/contentStats";

const first = PUBLISHED_DAILY_QUESTIONS[0]!;

describe("the counter id", () => {
  it("is poll-<question>-<option> and fits ContentIdSchema", () => {
    expect(pollContentId("nombre-pensado", "a")).toBe("poll-nombre-pensado-a");
    expect(ContentIdSchema.safeParse(pollContentId(first.id, "a")).success).toBe(true);
    expect(isPollContentId("poll-nombre-pensado-a")).toBe(true);
    expect(isPollContentId("senales-de-alarma-embarazo")).toBe(false);
  });

  it("is only accepted for a published question and option", () => {
    expect(isPublishedAnswer(first.id, first.options[0]!.key)).toBe(true);
    expect(isPublishedAnswer(first.id, "z")).toBe(false);
    expect(isPublishedAnswer("no-existe", "a")).toBe(false);
    expect(isPublishedAnswer("__proto__", "a")).toBe(false);
  });

  it("keeps the threshold at 30 unless the owner changes it", () => {
    expect(POLL_MIN_ANSWERS).toBe(30);
  });
});

describe("the POST body", () => {
  it("is strict: an id, a key and an optional week, nothing else", () => {
    expect(PollAnswerSchema.safeParse({ questionId: first.id, optionKey: "a" }).success).toBe(true);
    expect(PollAnswerSchema.safeParse({ questionId: first.id, optionKey: "a", week: 24 }).success).toBe(true);
    for (const extra of [{ userId: "u1" }, { trimester: 2 }, { text: "libre" }]) {
      expect(
        PollAnswerSchema.safeParse({ questionId: first.id, optionKey: "a", ...extra }).success,
        Object.keys(extra)[0],
      ).toBe(false);
    }
    expect(PollAnswerSchema.safeParse({ questionId: first.id, optionKey: "a", week: 99 }).success).toBe(false);
    expect(PollAnswerSchema.safeParse({ questionId: "Hola Mundo", optionKey: "a" }).success).toBe(false);
  });
});

describe("tallying counter rows", () => {
  const ids = first.options.map((option) => pollContentId(first.id, option.key));

  it("sums by trimester over all days and ignores week 0 and foreign ids", () => {
    const results = tallyByTrimester(first, [
      { contentId: ids[0]!, week: 8, views: 3 },
      { contentId: ids[0]!, week: 12, views: 2 },
      { contentId: ids[1]!, week: 20, views: 4 },
      { contentId: ids[1]!, week: 30, views: 1 },
      { contentId: ids[0]!, week: 0, views: 50 },
      { contentId: "poll-otra-pregunta-a", week: 20, views: 9 },
      { contentId: "senales-de-alarma-embarazo", week: 20, views: 9 },
    ]);
    expect(PollResultsSchema.safeParse(results).success).toBe(true);
    expect(countsFor(results, 1)).toEqual({
      counts: { ...Object.fromEntries(first.options.map((o) => [o.key, 0])), [first.options[0]!.key]: 5 },
      total: 5,
    });
    expect(countsFor(results, 2).total).toBe(4);
    expect(countsFor(results, 3).total).toBe(1);
  });

  it("answers zeros for every option with no rows", () => {
    const results = tallyByTrimester(first, []);
    expect(results.trimesters.map((t) => t.trimester)).toEqual([1, 2, 3]);
    expect(countsFor(results, 2).total).toBe(0);
    expect(countsFor(null, 2)).toEqual({ counts: {}, total: 0 });
  });

  it("the results schema is strict", () => {
    expect(
      PollResultsSchema.safeParse({ ...tallyByTrimester(first, []), week: 24 }).success,
    ).toBe(false);
  });
});

describe("percentages", () => {
  it("always add up to 100", () => {
    for (const counts of <Record<string, number>[]>[
      { a: 1, b: 1, c: 1 },
      { a: 10, b: 7, c: 3, d: 13 },
      { a: 2, b: 1 },
      { a: 30, b: 0, c: 0 },
    ]) {
      const keys = Object.keys(counts);
      const shares = percentages(counts, keys);
      expect(Object.values(shares).reduce((sum, value) => sum + value, 0), JSON.stringify(counts)).toBe(100);
    }
  });

  it("is zeros on an empty total and keeps every key", () => {
    expect(percentages({}, ["a", "b"])).toEqual({ a: 0, b: 0 });
    expect(percentages({ a: 3, b: 1 }, ["a", "b"])).toEqual({ a: 75, b: 25 });
  });
});

describe("which question today is", () => {
  it("is the same for everybody all day in Asunción, and changes at its midnight", () => {
    // 03:00 UTC on the 27th is still the 26th in Asunción (UTC-3).
    expect(localDayKey(new Date("2026-11-27T02:59:00Z"))).toBe("2026-11-26");
    expect(localDayKey(new Date("2026-11-27T03:00:00Z"))).toBe("2026-11-27");
    const morning = questionForDay(new Date("2026-11-26T10:00:00-03:00"));
    const night = questionForDay(new Date("2026-11-26T23:59:00-03:00"));
    const next = questionForDay(new Date("2026-11-27T00:00:00-03:00"));
    expect(morning?.id).toBe(night?.id);
    expect(next?.id).not.toBe(morning?.id);
  });

  it("walks the whole list before repeating one", () => {
    const seen = new Set<string>();
    const start = Date.parse("2026-11-26T12:00:00-03:00");
    for (let day = 0; day < PUBLISHED_DAILY_QUESTIONS.length; day += 1) {
      seen.add(questionForDay(new Date(start + day * 86_400_000))!.id);
    }
    expect(seen.size).toBe(PUBLISHED_DAILY_QUESTIONS.length);
  });

  it("is null with no questions", () => {
    expect(questionForDay(new Date(), [])).toBeNull();
  });
});

describe("her own answers on the device", () => {
  it("lives under one mibebe. key", () => {
    expect(POLL_STORAGE_KEY).toBe("mibebe.pregunta.respuestas");
  });

  it("keeps only published pairs from whatever is stored", () => {
    expect(parseAnswers(null)).toEqual({});
    expect(parseAnswers("{nope")).toEqual({});
    expect(parseAnswers("[1,2]")).toEqual({});
    expect(
      parseAnswers(JSON.stringify({ [first.id]: "a", "no-existe": "a", [PUBLISHED_DAILY_QUESTIONS[1]!.id]: "z" })),
    ).toEqual({ [first.id]: "a" });
  });
});
