import type { Trimester } from "./types";

// Pure pregnancy math (build spec §5). Unit-tested in lib/pregnancy.test.ts.

export const GESTATION_DAYS = 280; // 40 weeks from LMP
export const MIN_WEEK = 1;
export const MAX_WEEK = 42;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Clamp an arbitrary week number into the valid 1..42 range. */
export function clampWeek(week: number): number {
  if (Number.isNaN(week)) return MIN_WEEK;
  if (week < MIN_WEEK) return MIN_WEEK;
  if (week > MAX_WEEK) return MAX_WEEK;
  return Math.floor(week);
}

/**
 * Current gestational week from the last menstrual period.
 * Week 1 begins at the LMP date itself; result is clamped to 1..42.
 */
export function getCurrentWeek(lmp: number, now: number = Date.now()): number {
  const days = Math.floor((now - lmp) / MS_PER_DAY);
  const week = Math.floor(days / 7) + 1;
  return clampWeek(week);
}

/** Trimester for a given week: T1 w1–13, T2 w14–27, T3 w28+. */
export function getTrimester(week: number): Trimester {
  const w = clampWeek(week);
  if (w <= 13) return 1;
  if (w <= 27) return 2;
  return 3;
}

/** Estimated due date = LMP + 280 days. */
export function getDueDate(lmp: number): number {
  return lmp + GESTATION_DAYS * MS_PER_DAY;
}

/** Back-calculate the LMP from an entered due date (build spec §1). */
export function lmpFromDueDate(dueDate: number): number {
  return dueDate - GESTATION_DAYS * MS_PER_DAY;
}

/**
 * Raw (un-clamped) gestational week, for validation in the date editor
 * (build spec §1): lets the UI warn when an entered date implies a term
 * beyond 42 weeks while still allowing the save.
 */
export function getRawWeek(lmp: number, now: number = Date.now()): number {
  const days = Math.floor((now - lmp) / MS_PER_DAY);
  return Math.floor(days / 7) + 1;
}

/** Days remaining until the due date (never negative). */
export function getDaysRemaining(lmp: number, now: number = Date.now()): number {
  const remaining = Math.ceil((getDueDate(lmp) - now) / MS_PER_DAY);
  return remaining < 0 ? 0 : remaining;
}

/** Whole days elapsed since the LMP (clamped at 0). */
export function getDaysSinceLMP(lmp: number, now: number = Date.now()): number {
  const days = Math.floor((now - lmp) / MS_PER_DAY);
  return days < 0 ? 0 : days;
}

export interface CompletedGestation {
  /** Completed weeks (carné perinatal convention): floor(daysSinceLMP / 7). */
  weeks: number;
  /** Remaining days into the current week: daysSinceLMP % 7. */
  days: number;
}

/**
 * Medical "completed weeks + days" gestation used on the carné perinatal
 * (build spec §1). The friendly week shown to the user is this `weeks` + 1.
 */
export function getCompletedGestation(
  lmp: number,
  now: number = Date.now(),
): CompletedGestation {
  const total = getDaysSinceLMP(lmp, now);
  return { weeks: Math.floor(total / 7), days: total % 7 };
}

/** es-PY label for completed gestation, e.g. "17 semanas y 2 días". */
export function formatCompletedGestation(g: CompletedGestation): string {
  const weeks = `${g.weeks} ${g.weeks === 1 ? "semana" : "semanas"}`;
  const days = `${g.days} ${g.days === 1 ? "día" : "días"}`;
  return `${weeks} y ${days}`;
}
