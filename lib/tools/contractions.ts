// BUILD-PLAN D7 — the contractions timer's pure half: is the pattern
// 5-1-1 ("every 5 minutes, lasting 1 minute, for 1 hour")? A pregnant woman at
// 3 a.m. who has just noticed this is not the moment to make her read a
// definition — the function decides, the screen only ever shows a hint or
// nothing.
//
// Deliberately silent, not reassuring, when the data is thin or the week is
// early: a "todavía no es momento" reads as medical reassurance the app has no
// business giving. Below 37 weeks the hint never fires at all, whatever the
// numbers say — a 5-1-1-shaped pattern before term is not this function's
// call to make safe.

import type { BilingualText } from "@/lib/content/schemas";

export interface ContractionSample {
  startedAt: number;
  /** 0 (or absent) for a contraction still in progress. */
  durationSec: number;
}

export interface Assess511Options {
  /** Current gestational week, if known. Omitted week never suppresses the hint on its own. */
  weekAtNow?: number;
  /** A contraction currently being timed, not yet in `entries`. */
  inProgressStartedAt?: number;
}

export interface Assess511Result {
  pattern: "5-1-1";
}

const WINDOW_MS = 60 * 60 * 1000;
const MIN_COUNT = 6;
const MAX_AVG_INTERVAL_SEC = 5 * 60;
const MIN_MEDIAN_DURATION_SEC = 45;
/** The hint never fires before this week — see the module note above. */
export const MIN_WEEK_FOR_HINT = 37;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/**
 * Over the last 60 minutes: contractions roughly every 5 minutes (average gap
 * between starts ≤ 5 min, at least 6 of them) lasting roughly 1 minute
 * (median duration ≥ 45 s). Pure, timezone-free — `now` is the only clock it
 * reads. Tolerant of a contraction still in progress: pass its start as
 * `inProgressStartedAt` and it counts toward the pattern and the gaps, not
 * toward the duration median (its duration is not known yet).
 */
export function assess511(
  entries: ContractionSample[],
  now: number,
  options: Assess511Options = {},
): Assess511Result | null {
  if (options.weekAtNow !== undefined && options.weekAtNow < MIN_WEEK_FOR_HINT) {
    return null;
  }

  const samples: ContractionSample[] = options.inProgressStartedAt
    ? [...entries, { startedAt: options.inProgressStartedAt, durationSec: 0 }]
    : entries;

  const recent = samples
    .filter((e) => e.startedAt <= now && now - e.startedAt <= WINDOW_MS)
    .sort((a, b) => a.startedAt - b.startedAt);

  if (recent.length < MIN_COUNT) return null;

  const gaps: number[] = [];
  for (let i = 1; i < recent.length; i += 1) {
    gaps.push((recent[i]!.startedAt - recent[i - 1]!.startedAt) / 1000);
  }
  const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  if (avgGap > MAX_AVG_INTERVAL_SEC) return null;

  const durations = recent.map((e) => e.durationSec).filter((d) => d > 0);
  if (durations.length === 0) return null;
  if (median(durations) < MIN_MEDIAN_DURATION_SEC) return null;

  return { pattern: "5-1-1" };
}

/**
 * es-PY voseo, jopara `gn` draft — pending native review (D6, see
 * `docs/GUARANI-REVIEW.md`). Never "todo está bien": the pattern is a reason
 * to call, not a diagnosis.
 */
export const CONTRACTIONS_511_HINT: BilingualText = {
  es: "Tus contracciones llegan cada 5 minutos y duran cerca de 1 minuto, así desde hace una hora: es momento de llamar a tu sanatorio.",
  gn: "Ne contracción ou 5 minuto-gui 5 minuto-pe ha ipuku peteĩ minuto rupi, peteĩ hora guive: ko'ág̃a ehenói ne sanatorio.",
};
