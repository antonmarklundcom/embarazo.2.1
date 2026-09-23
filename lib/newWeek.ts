// "Semana nueva" — the moment her week turns over, on Hoy.
//
// Her weeks are counted from her own date (FUM, or the one derived from the
// ecografía / FIV), so they turn on that date's weekday, not on Mondays: an
// FUM on a Wednesday makes every Wednesday a new week. The push side of the
// same idea is `weekStartTimes` in `lib/push/weekly.ts`; this is the card she
// sees when she opens the app on (or just after) that day.
//
// Pure except for the two storage helpers, which are per-device conveniences
// ("already seen this week's card") and fail closed to "not seen".

/** The card shows on the turnover day and the two days after it. */
export const NEW_WEEK_WINDOW_DAYS = 3;

const SEEN_KEY = "mibebe.newWeek.seen";

const WEEKDAYS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

/** `daysIntoWeek` is the "+d" of the carné's "20+d": 0 on the turnover day. */
export function inNewWeekWindow(daysIntoWeek: number): boolean {
  return daysIntoWeek >= 0 && daysIntoWeek < NEW_WEEK_WINDOW_DAYS;
}

/** The weekday her weeks turn on, in es-PY: "miércoles". */
export function turnoverWeekday(lmpDate: number): string {
  return WEEKDAYS_ES[new Date(lmpDate).getDay()]!;
}

/** The card's headline, for the friendly week (1-based, as on /semana/N). */
export function newWeekTitle(week: number, daysIntoWeek: number): string {
  return daysIntoWeek === 0
    ? `¡Hoy empezás la semana ${week}!`
    : `Empezaste la semana ${week}`;
}

export function readSeenWeek(): number | null {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function markWeekSeen(week: number): void {
  try {
    window.localStorage.setItem(SEEN_KEY, String(week));
  } catch {
    // Private mode: the card simply comes back next open this week.
  }
}
