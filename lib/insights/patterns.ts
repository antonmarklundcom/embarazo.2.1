import { isAnalysableSymptom } from "@/lib/symptoms";

// BUILD-PLAN K9 / F3 — symptom insight (docs/FABLE-PLAN-2026-08.md §3).
//
// "Tus dolores de cabeza aparecen los días que dormís mal." One observation,
// computed **entirely on the device** from data she already logged, and phrased
// so that it can never be read as a diagnosis.
//
// Three rules shape every line of this file, and they are the reason it is
// mostly thresholds:
//
//   1. **It is arithmetic, not medicine.** The output is a *finding* — a
//      symptom, two counts, a comparison — and never a sentence. The words come
//      from a seed file gated on a named medical reviewer (`lib/seed/insights`),
//      the same gate C5's obstetra card uses. Code that computes and copy that
//      claims are kept apart on purpose.
//   2. **Silence is the default and it is not a failure.** With little data,
//      or a weak signal, this returns nothing. A pregnancy app that manufactures
//      a "pattern" out of four entries is teaching a user to believe things that
//      are not there, about her own body, during a pregnancy.
//   3. **Never causal.** The findings are co-occurrence. The templates say
//      "aparecen los días que…", never "por", never "porque", never "te causa" —
//      and a test asserts the seed contains no causal or diagnostic verb.
//
// This module reads nothing and writes nothing. `lib/insights/client.ts` feeds
// it rows; nothing it produces leaves the device.

// ---------------------------------------------------------------------------
// Thresholds — the honesty budget
// ---------------------------------------------------------------------------

/** Below this many logged days, no finding is offered at all. */
export const MIN_LOGGED_DAYS = 10;

/** A symptom seen fewer times than this is not a pattern, it is a Tuesday. */
export const MIN_OCCURRENCES = 3;

/** Each side of a comparison needs this many days to be worth comparing. */
export const MIN_GROUP_DAYS = 4;

/**
 * How much more often, in percentage points, before we say anything.
 *
 * 30 points is a deliberately blunt bar. The alternative — a p-value on a
 * fortnight of self-reported daily check-ins — would be false precision, and
 * the honest version of "is this real?" at this sample size is "only say it
 * when it is obvious".
 */
export const MIN_DIFFERENCE = 0.3;

/** A night rated 1 or 2 out of 5. The tool's own scale (D2). */
export const POOR_SLEEP_QUALITY = 2;

/** How far back a finding may look. Older than this is another trimester. */
export const WINDOW_DAYS = 30;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface JournalDay {
  /** Epoch ms of the entry. */
  createdAt: number;
  mood?: string;
  symptoms: string[];
}

export interface SleepNight {
  /** Epoch ms, midnight of the morning she woke up (D2's convention). */
  date: number;
  quality: number;
}

/** The finding. A template id and the numbers that fill it — never a sentence. */
export interface Insight {
  templateId: "sleep" | "mood" | "frequent";
  symptom: string;
  /** How many of the days in the "with" group had this symptom. */
  withCount: number;
  withDays: number;
  withoutCount: number;
  withoutDays: number;
}

// ---------------------------------------------------------------------------
// Day bucketing
// ---------------------------------------------------------------------------

/**
 * Local midnight for a timestamp.
 *
 * Days, not 24-hour windows, and **local** days: a check-in at 23:30 and a
 * night's sleep logged the next morning belong to different days, and UTC
 * bucketing would put a 21:00 Asunción entry on tomorrow.
 */
export function dayKey(ts: number): number {
  const date = new Date(ts);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface Day {
  key: number;
  symptoms: Set<string>;
  mood?: string;
}

/**
 * Collapse entries into one record per day.
 *
 * Several check-ins on one day is one day with the union of what she reported,
 * not three votes. Otherwise a bad day she logged three times outweighs a week
 * of quiet ones.
 */
function byDay(entries: readonly JournalDay[], now: number): Day[] {
  const cutoff = dayKey(now) - WINDOW_DAYS * DAY_MS;
  const days = new Map<number, Day>();

  for (const entry of entries) {
    const key = dayKey(entry.createdAt);
    if (key < cutoff || key > dayKey(now)) continue;
    const day = days.get(key) ?? { key, symptoms: new Set<string>() };
    for (const symptom of entry.symptoms) {
      if (isAnalysableSymptom(symptom)) day.symptoms.add(symptom);
    }
    // The worst mood of the day wins: "how was today" is not an average.
    if (entry.mood && (!day.mood || moodRank(entry.mood) < moodRank(day.mood))) {
      day.mood = entry.mood;
    }
    days.set(key, day);
  }

  return [...days.values()].sort((a, b) => a.key - b.key);
}

const MOOD_ORDER = ["muy_mal", "mal", "regular", "bien", "muy_bien"];

function moodRank(mood: string): number {
  const index = MOOD_ORDER.indexOf(mood);
  return index === -1 ? MOOD_ORDER.length : index;
}

function isLowMood(mood: string | undefined): boolean {
  return mood === "mal" || mood === "muy_mal";
}

// ---------------------------------------------------------------------------
// The comparison
// ---------------------------------------------------------------------------

/**
 * Compare a symptom's rate between two sets of days.
 *
 * Returns null unless BOTH groups are big enough and the gap is wide enough.
 * Returning null is the normal outcome and the point of the function.
 */
function compare(
  symptom: string,
  templateId: Insight["templateId"],
  withDays: Day[],
  withoutDays: Day[],
): Insight | null {
  if (withDays.length < MIN_GROUP_DAYS) return null;
  if (withoutDays.length < MIN_GROUP_DAYS) return null;

  const withCount = withDays.filter((day) => day.symptoms.has(symptom)).length;
  const withoutCount = withoutDays.filter((day) =>
    day.symptoms.has(symptom),
  ).length;

  if (withCount < MIN_OCCURRENCES) return null;

  const withRate = withCount / withDays.length;
  const withoutRate = withoutCount / withoutDays.length;
  if (withRate - withoutRate < MIN_DIFFERENCE) return null;

  return {
    templateId,
    symptom,
    withCount,
    withDays: withDays.length,
    withoutCount,
    withoutDays: withoutDays.length,
  };
}

/**
 * Every finding worth showing, strongest first.
 *
 * Deterministic: same input, same order, always. A "trend" that reshuffles
 * itself between two renders is not a trend.
 */
export function findInsights(
  entries: readonly JournalDay[],
  nights: readonly SleepNight[],
  now: number = Date.now(),
): Insight[] {
  const days = byDay(entries, now);
  if (days.length < MIN_LOGGED_DAYS) return [];

  const poorSleepDays = new Set(
    nights
      .filter((night) => night.quality <= POOR_SLEEP_QUALITY)
      .map((night) => dayKey(night.date)),
  );

  const symptoms = [...new Set(days.flatMap((day) => [...day.symptoms]))].sort();
  const found: Insight[] = [];

  for (const symptom of symptoms) {
    // A symptom she has barely logged is not a pattern in either direction.
    const total = days.filter((day) => day.symptoms.has(symptom)).length;
    if (total < MIN_OCCURRENCES) continue;

    const afterBadNight = compare(
      symptom,
      "sleep",
      days.filter((day) => poorSleepDays.has(day.key)),
      days.filter((day) => !poorSleepDays.has(day.key)),
    );
    if (afterBadNight) found.push(afterBadNight);

    const withLowMood = compare(
      symptom,
      "mood",
      days.filter((day) => isLowMood(day.mood)),
      days.filter((day) => day.mood !== undefined && !isLowMood(day.mood)),
    );
    if (withLowMood) found.push(withLowMood);
  }

  if (found.length === 0) {
    // Nothing correlated. The most-logged symptom is still a true, useful
    // observation and it is the one thing worth saying when nothing else is —
    // but only when it is genuinely dominant, or it is just a list.
    const ranked = symptoms
      .map((symptom) => ({
        symptom,
        count: days.filter((day) => day.symptoms.has(symptom)).length,
      }))
      .sort((a, b) => b.count - a.count || a.symptom.localeCompare(b.symptom));

    const top = ranked[0];
    if (top && top.count >= MIN_OCCURRENCES && top.count / days.length >= 0.4) {
      found.push({
        templateId: "frequent",
        symptom: top.symptom,
        withCount: top.count,
        withDays: days.length,
        withoutCount: 0,
        withoutDays: 0,
      });
    }
  }

  return found.sort(
    (a, b) => strength(b) - strength(a) || a.symptom.localeCompare(b.symptom),
  );
}

function strength(insight: Insight): number {
  if (insight.withDays === 0) return 0;
  const withRate = insight.withCount / insight.withDays;
  const withoutRate =
    insight.withoutDays === 0 ? 0 : insight.withoutCount / insight.withoutDays;
  return withRate - withoutRate;
}
