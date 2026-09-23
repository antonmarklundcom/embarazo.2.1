// BUILD-PLAN D7 — the kicks counter's pure half: is today's rate meaningfully
// below her own baseline? There is no universal "normal kicks per hour"; the
// only honest comparison is against herself, and only once there is enough of
// her own history to compare against.
//
// Silent, not reassuring, exactly like `assess511`: with fewer than 3 prior
// completed sessions there is no baseline, so `kickBaseline` returns `null`
// and `kickNudge` says nothing rather than guessing.

import type { BilingualText } from "@/lib/content/schemas";

export interface KickSessionSample {
  startedAt: number;
  count: number;
  /** Undefined (or ≤ startedAt) means the session never completed. */
  completedAt?: number;
}

const MIN_PRIOR_SESSIONS = 3;
const BASELINE_WINDOW = 7;
const NUDGE_RATIO = 0.5;
const RATE_WINDOW_MIN = 10;

/** Kicks per 10-minute window it took to reach today's count. */
function rate(session: { startedAt: number; completedAt: number; count: number }): number {
  const minutes = (session.completedAt - session.startedAt) / 60000;
  if (minutes <= 0) return session.count * RATE_WINDOW_MIN;
  return (session.count / minutes) * RATE_WINDOW_MIN;
}

/**
 * Median kicks-per-10-min over the last 7 *completed* sessions (most recent
 * first). `null` when fewer than 3 completed sessions exist — the baseline
 * being `null` is how `kickNudge` knows there isn't enough history yet.
 */
export function kickBaseline(sessions: KickSessionSample[]): number | null {
  const completed = sessions
    .filter((s) => s.completedAt !== undefined && s.completedAt > s.startedAt)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, BASELINE_WINDOW)
    .map((s) => ({ startedAt: s.startedAt, count: s.count, completedAt: s.completedAt! }));

  if (completed.length < MIN_PRIOR_SESSIONS) return null;

  const rates = completed.map(rate);
  const sorted = [...rates].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/**
 * A nudge only when a baseline exists (≥ 3 prior completed sessions, see
 * `kickBaseline`) and today's rate is below half of it. Never "todo está
 * bien" on the other side — the screen simply shows nothing.
 */
export function kickNudge(
  today: { startedAt: number; count: number; completedAt: number },
  baseline: number | null,
): { nudge: true } | null {
  if (baseline === null || baseline <= 0) return null;
  if (rate(today) < baseline * NUDGE_RATIO) return { nudge: true };
  return null;
}

/** The session's goal: this many movements… */
export const KICK_GOAL = 10;
/** …within this window (2 hours). */
export const KICK_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * True once a session has run past the 2-hour window without reaching the
 * goal. This is the one verdict the counter gives without any history at all,
 * because it is not a comparison against her — it is the counting method's own
 * definition of "fewer movements than expected". The screen used to answer it
 * with "(pasaste las 2 horas)" in muted grey next to the clock, which read as a
 * timer remark rather than the alarm sign it is; it now renders
 * `KICKS_WINDOW_ALERT` with a link to /emergencia.
 */
export function kickWindowMissed(count: number, elapsedMs: number): boolean {
  return elapsedMs > KICK_WINDOW_MS && count < KICK_GOAL;
}

/**
 * es-PY voseo, jopara `gn` draft — pending native review (D6, see
 * `docs/GUARANI-REVIEW.md`). Reuses the "se mueve menos de lo habitual"
 * phrasing `lib/emergency.ts` already carries in Guaraní, for consistency.
 *
 * It used to end in "andá a /emergencia" — a route path, shown as text, to a
 * woman who is worried about her baby. The sentence now ends in words ("la
 * guardia", the same phrasing `lib/emergency.ts` uses) and the screen renders
 * a real link to /emergencia beside it.
 */
export const KICKS_NUDGE_HINT: BilingualText = {
  es: "Sentiste menos que tu ritmo habitual — si te preocupa, consultá con tu sanatorio o andá a la guardia.",
  gn: "Nde memby omýi sa'ive jepivégui — oĩramo ndéve preocupación, eñeporandu ne sanatoriope térã tereho pe guardia-pe.",
};

/**
 * Shown when `kickWindowMissed` is true. Same draft status as the nudge above.
 * "No esperes" on purpose: fewer movements than usual is on the /emergencia
 * alarm-sign list, and this is not the place to suggest waiting it out.
 */
export const KICKS_WINDOW_ALERT: BilingualText = {
  es: "Si sentís menos movimientos de lo normal, no esperes: consultá hoy con tu médico/a o andá a la guardia.",
  gn: "Nde memby omýi sa'ive jepivégui, ani reha'arõ: eñeporandu ko árape ne médico/a-pe térã tereho pe guardia-pe.",
};
