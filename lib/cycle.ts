// Pure menstrual-cycle math (build spec §3). Estimates only — these helpers
// power the period predictor and the fertile-window estimate. NONE of this is
// a diagnosis or a contraception method; the UI states that clearly.
// Unit-tested in lib/cycle.test.ts.

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;

// Typical luteal phase length; ovulation is estimated this many days before the
// next period starts (a standard, deliberately simple assumption).
export const LUTEAL_PHASE_DAYS = 14;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Predicted first day of the next period from the last start + avg length. */
export function predictNextStart(
  lastStart: number,
  avgCycleLength: number = DEFAULT_CYCLE_LENGTH,
): number {
  return lastStart + avgCycleLength * MS_PER_DAY;
}

export interface FertileWindow {
  /** Estimated ovulation day. */
  ovulation: number;
  /** Start of the fertile window (5 days before ovulation). */
  start: number;
  /** End of the fertile window (1 day after ovulation). */
  end: number;
}

/**
 * Estimate the fertile window for the cycle that began on `cycleStart`.
 * Ovulation ≈ cycleStart + (avgCycleLength − 14). The window spans the 5 days
 * before ovulation through the day after — when conception is most likely.
 */
export function estimateFertileWindow(
  cycleStart: number,
  avgCycleLength: number = DEFAULT_CYCLE_LENGTH,
): FertileWindow {
  const ovulation =
    cycleStart + (avgCycleLength - LUTEAL_PHASE_DAYS) * MS_PER_DAY;
  return {
    ovulation,
    start: ovulation - 5 * MS_PER_DAY,
    end: ovulation + 1 * MS_PER_DAY,
  };
}

/** The range the settings screen accepts for a cycle, in days. */
export const MIN_CYCLE_LENGTH = 20;
export const MAX_CYCLE_LENGTH = 60;

/**
 * Average cycle length (in days) computed from consecutive period starts.
 * Returns undefined when there aren't at least two usable gaps.
 *
 * Only gaps inside the same 20–60 day range the settings screen enforces
 * count. The observed average *overrides* that setting, so without this a
 * double tap on "Registrar" (a 0-day gap) or logging every bleeding day
 * (1-day gaps) produced a "cycle" of a day or two, and a month she forgot to
 * log produced a 56-day one — each pulling the predicted period and the
 * fertile window into nonsense.
 */
export function averageCycleLength(starts: number[]): number | undefined {
  if (starts.length < 2) return undefined;
  const sorted = [...starts].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.round((sorted[i]! - sorted[i - 1]!) / MS_PER_DAY);
    if (gap >= MIN_CYCLE_LENGTH && gap <= MAX_CYCLE_LENGTH) gaps.push(gap);
  }
  if (gaps.length === 0) return undefined;
  return Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length);
}

/** Day number within the current cycle (day 1 = the start date). */
export function cycleDay(cycleStart: number, now: number = Date.now()): number {
  const day = Math.floor((now - cycleStart) / MS_PER_DAY) + 1;
  return day < 1 ? 1 : day;
}

/** Whole days from `now` until `target` (negative if already past). */
export function daysUntil(target: number, now: number = Date.now()): number {
  return Math.ceil((target - now) / MS_PER_DAY);
}
