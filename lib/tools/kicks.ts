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

/**
 * es-PY voseo, jopara `gn` draft — pending native review (D6, see
 * `docs/GUARANI-REVIEW.md`). Reuses the "se mueve menos de lo habitual"
 * phrasing `lib/emergency.ts` already carries in Guaraní, for consistency.
 */
export const KICKS_NUDGE_HINT: BilingualText = {
  es: "Sentiste menos que tu ritmo habitual — si te preocupa, consultá con tu sanatorio o andá a /emergencia.",
  gn: "Nde memby omýi sa'ive jepivégui — oĩramo ndéve preocupación, eñeporandu ne sanatoriope térã tereho /emergencia-pe.",
};
