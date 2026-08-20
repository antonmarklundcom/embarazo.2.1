// K9-F6 (docs/FABLE-PLAN-2026-08.md §3) — "memory + gentle streak on the
// existing mood check-in; celebrate, never guilt-trip".
//
// The whole feature is here as arithmetic over timestamps so that the one part
// that could hurt somebody — what the app says when the run ends — is decided
// by a function with tests rather than by a component.
//
// **The guilt-trip is a design, not an accident.** Every streak product that
// hurts people does the same three things: it counts the run *from the day it
// broke*, it tells you the number you lost, and it treats a missed day as a
// failure state with its own screen. This module cannot do any of them,
// because it does not return them: there is no `brokenAt`, no `longest`, no
// `lostDays`. A woman who was too sick to open the app for a week gets a
// counter that starts again at one, and nothing that mentions the week.
//
// The other half is the grace day. A streak that dies at midnight makes the
// app something you owe. A run stays alive until the end of *tomorrow*, so
// "I forgot yesterday, I logged this morning" is a continuous run — which is
// what it honestly is for a person, and the exact case where a stricter rule
// would punish somebody with morning sickness for sleeping in.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface StreakState {
  /** Consecutive days logged, counting back from today. Zero means no run. */
  days: number;
  /** Whether today already has a mood on it. */
  loggedToday: boolean;
}

/**
 * The local calendar day a timestamp falls on, as a day number.
 *
 * Local, not UTC: a woman in Asunción logging at 21:00 is logging *today*, and
 * a UTC day boundary would file half her evenings under tomorrow and break the
 * run she can see herself keeping. `Date` does the timezone work; the day
 * number is then just the epoch-day of that local midnight.
 */
export function localDay(timestamp: number): number {
  const date = new Date(timestamp);
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY,
  );
}

/**
 * The run of consecutive days ending today or yesterday.
 *
 * Takes bare timestamps rather than journal rows: the caller has already
 * decided what counts as a check-in (an entry carrying a mood), and this
 * function has no business knowing what a `JournalEntry` is.
 *
 * Two or more entries on the same day are one day. Entries in the future are
 * ignored rather than trusted — a device whose clock is wrong should not be
 * congratulated for tomorrow.
 */
export function moodStreak(
  timestamps: readonly number[],
  now: number = Date.now(),
): StreakState {
  const today = localDay(now);
  const days = new Set(
    timestamps.map(localDay).filter((day) => day <= today),
  );

  const loggedToday = days.has(today);
  // The grace day: a run that includes yesterday is still alive today, and
  // stays alive until tomorrow ends. Without this the counter resets at
  // midnight for somebody who simply has not opened the app yet this morning.
  let cursor = loggedToday ? today : today - 1;
  if (!days.has(cursor)) return { days: 0, loggedToday };

  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor -= 1;
  }
  return { days: count, loggedToday };
}

/**
 * What to say about a run, or `null` to say nothing at all.
 *
 * `null` for a run of one is the load-bearing case. "Día 1 de tu racha" turns
 * a single tap into an obligation the app has just invented for her, and it is
 * the sentence every one of these features opens with. A run is worth
 * mentioning once it is a run.
 */
export function streakSentence(state: StreakState): string | null {
  if (state.days < 2) return null;
  if (state.days >= 7 && state.days % 7 === 0) {
    const weeks = state.days / 7;
    return weeks === 1
      ? "Una semana seguida contándonos cómo estás. 💛"
      : `${weeks} semanas seguidas contándonos cómo estás. 💛`;
  }
  return `${state.days} días seguidos. 💛`;
}
