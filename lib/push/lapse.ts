// The 14-day "¿Cómo vas?" nudge — the device half.
//
// One poke, 14 days after she last opened the app, at 10:00 local. The time is
// recomputed on every app open (`recordAppOpen`, called from
// `refreshWeeklyTips` on start), so while she keeps using the app it keeps
// moving forward and never fires; it only lands once she has been away for two
// weeks. Device-local and payload-free in B5's sense: the server would only
// ever learn one epoch-ms instant, never that it is a "you have been away"
// poke, and never anything about her week.
//
// NOT LIVE YET — `LAPSE_NUDGE_SERVER_READY` is false. The server's
// `pushReminders.category` is a MySQL ENUM over PUSH_CATEGORIES (see
// drizzle/0011, which was needed just to add `mimos`). A poke the device can
// opt out of separately needs its own category there, which is a schema
// migration this unit was not allowed to make. Until it exists:
//   * nothing here is sent to `/api/v1/push` (the route's strict schema would
//     reject an unknown field anyway),
//   * Ajustes does not show the toggle,
//   * the service worker does not compose `lapseSentence` (it would also need
//     the last-open instant mirrored into Cache Storage, since a worker cannot
//     read localStorage).
// The last-open timestamp IS recorded from now on, so the nudge has an anchor
// on the day the server half ships.
//
// Pure helpers plus two tiny localStorage wrappers, so the arithmetic is
// testable without a browser.

import { WEEKLY_TIP_HOUR } from "./weekly";

/** Flip only together with the server category, its migration and SW wiring. */
export const LAPSE_NUDGE_SERVER_READY = false;

/** New key (never rename existing `mibebe.*` keys). Epoch ms of the last open. */
export const LAST_OPEN_KEY = "mibebe.push.lastOpenAt";
/** New key. "1" when she opted into the nudge; absent = off (the default). */
export const LAPSE_OPT_IN_KEY = "mibebe.push.lapse";

/** Calendar days without opening the app before the nudge lands. */
export const LAPSE_DAYS = 14;

/**
 * The instant the nudge should land for a given last open: the local calendar
 * date `LAPSE_DAYS` later, at 10:00. Calendar days rather than 14 × 24 h so a
 * DST change in between does not shift it to 09:00 or 11:00.
 */
export function lapseNudgeTime(lastOpenAt: number): number {
  const at = new Date(lastOpenAt);
  at.setDate(at.getDate() + LAPSE_DAYS);
  at.setHours(WEEKLY_TIP_HOUR, 0, 0, 0);
  return at.getTime();
}

/**
 * The schedule to publish: at most one entry, and only when she opted in and
 * the time is still ahead. Empty clears a previously published nudge.
 */
export function lapseTimes(
  lastOpenAt: number | null,
  optedIn: boolean,
  now: number = Date.now(),
): number[] {
  if (!optedIn || lastOpenAt === null) return [];
  const at = lapseNudgeTime(lastOpenAt);
  return at > now ? [at] : [];
}

/** Read the last-open instant, or null when absent, damaged or unreadable. */
export function readLastOpen(): number | null {
  try {
    const raw = localStorage.getItem(LAST_OPEN_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Record that she opened the app (resets the 14-day clock) and return the
 * nudge time that now applies. Never throws: private browsing just means the
 * clock is not kept.
 */
export function recordAppOpen(now: number = Date.now()): number {
  try {
    localStorage.setItem(LAST_OPEN_KEY, String(now));
  } catch {
    // Storage refused.
  }
  return lapseNudgeTime(now);
}

/** Her choice for the nudge. Off unless she turned it on. */
export function lapseNudgeOptedIn(): boolean {
  try {
    return localStorage.getItem(LAPSE_OPT_IN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLapseNudgeOptIn(on: boolean): void {
  try {
    if (on) localStorage.setItem(LAPSE_OPT_IN_KEY, "1");
    else localStorage.removeItem(LAPSE_OPT_IN_KEY);
  } catch {
    // Storage refused: the choice does not stick, and the default is off.
  }
}

/** Ajustes copy for the toggle, shown only once the server half exists. */
export const LAPSE_TOGGLE_INFO = {
  label: "Si pasan dos semanas sin abrir la app",
  description: "Un solo aviso tranquilo. Mientras abras la app, no te llega.",
} as const;
