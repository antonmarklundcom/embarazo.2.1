// Calendar dates for the specs, computed in the zone the app's audience uses.
//
// The app reads an `<input type="date">` value, and the "today" it compares
// against, in the browser's local zone. playwright.config.ts pins that zone to
// America/Asuncion. Building the same date in Node with `toISOString()` gives
// the UTC calendar date instead, which is already tomorrow between 21:00 and
// 24:00 in Paraguay (UTC-3). Node's own local getters only agree with the
// browser when the machine itself is in Paraguay. So every helper here works
// from the Asuncion calendar date explicitly, whatever zone the machine is in.

const TIME_ZONE = "America/Asuncion";

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const dayParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const wallParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const pad = (value: number) => String(value).padStart(2, "0");

function calendarDateOf(instant: number | Date): CalendarDate {
  const parts = Object.fromEntries(
    dayParts.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

/** Day arithmetic on a bare calendar date: UTC is used only as a counter, so no DST can shift it. */
function addDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function formatIsoDay(date: CalendarDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/** Offset of the Asuncion wall clock from UTC at `instant`, in milliseconds. */
function zoneOffsetAt(instant: number): number {
  const parts = Object.fromEntries(
    wallParts.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  const wallAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return wallAsUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * The `<input type="date">` value (YYYY-MM-DD) for the Asuncion calendar day
 * `daysFromToday` away from `now`. Negative values are in the past.
 */
export function localDateInput(daysFromToday: number, now: Date = new Date()): string {
  return formatIsoDay(addDays(calendarDateOf(now), daysFromToday));
}

/** The Asuncion calendar day (YYYY-MM-DD) that an instant falls on. */
export function localDateOf(instant: number | Date): string {
  return formatIsoDay(calendarDateOf(instant));
}

/**
 * Epoch milliseconds of `hour:minute` on the Asuncion calendar day
 * `daysFromToday` away from `now` (for example, 09:00 tomorrow).
 */
export function localTimeOn(
  daysFromToday: number,
  hour: number,
  minute = 0,
  now: Date = new Date(),
): number {
  const day = addDays(calendarDateOf(now), daysFromToday);
  const guess = Date.UTC(day.year, day.month - 1, day.day, hour, minute);
  // One correction pass: the offset is read at the guess and again at the result.
  const first = guess - zoneOffsetAt(guess);
  return guess - zoneOffsetAt(first);
}
