// Pregnancy dates keep their existing epoch-ms storage/backup/sync contract.
// Interpret each timestamp as the calendar date the device already displays
// (local year/month/day, as in toDateInput); never rewrite or UTC-normalize rows.
// Legacy rows contain no originating zone: travelling can project an old
// timestamp onto another date, just as before. Recovering that original date
// would require explicit metadata/user confirmation, not an inferred migration.

const MS_PER_DAY = 86_400_000;

/** A local civil date's ordinal, independent of DST's 23/25-hour days. */
export function calendarDay(timestamp: number): number {
  const date = new Date(timestamp);
  // setUTCFullYear also handles years 0..99 without Date.UTC's 1900 offset.
  const day = new Date(0);
  day.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  return day.getTime() / MS_PER_DAY;
}

export function calendarDaysBetween(from: number, to: number): number {
  return calendarDay(to) - calendarDay(from);
}

/** Preserve the stored wall-clock time while adding local calendar days. */
export function addCalendarDays(timestamp: number, days: number): number {
  const date = new Date(timestamp);
  // Durations historically accepted fractional days. Preserve that contract
  // explicitly rather than silently truncating with Date.setDate.
  const whole = Math.trunc(days);
  date.setDate(date.getDate() + whole);
  return date.getTime() + (days - whole) * MS_PER_DAY;
}
