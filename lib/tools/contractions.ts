// BUILD-PLAN D7 — the contractions timer's pure half: is the pattern
// 5-1-1 ("every 5 minutes, lasting 1 minute, for 1 hour")? A pregnant woman at
// 3 a.m. who has just noticed this is not the moment to make her read a
// definition — the function decides, the screen only ever shows a hint or
// nothing.
//
// Deliberately silent, not reassuring, when the data is thin: a "todavía no es
// momento" reads as medical reassurance the app has no business giving.
//
// Below 37 weeks the same pattern is NOT silence any more — it is the other,
// louder answer. This module used to return `null` there ("a 5-1-1-shaped
// pattern before term is not this function's call to make safe"), and the
// intent was right but the effect was backwards: regular contractions before
// term are preterm labour, an alarm sign in their own right, and a woman at
// 33 weeks timing a textbook hour got exactly the same empty screen as one
// timing two twinges. Saying nothing was not "not making it safe", it was
// making it look safe. So the detection below is shared and only the verdict
// differs: `"5-1-1"` at term (call your sanatorio, labour is starting) and
// `"preterm"` before it (call now or go to the guardia — it should not be
// happening yet). No looser threshold for the preterm case: the pattern it
// fires on is the same one a reviewer already agreed is "regular", and a
// second, softer definition would be a clinical call this file cannot make.

import type { BilingualText } from "@/lib/content/schemas";

export interface ContractionSample {
  startedAt: number;
  /** 0 (or absent) for a contraction still in progress. */
  durationSec: number;
}

export interface Assess511Options {
  /**
   * Current gestational week, if known. Below `MIN_WEEK_FOR_HINT` a matching
   * pattern is reported as `"preterm"`; omitted, it is treated as term (the
   * hint still fires — an unknown week never silences it on its own).
   */
  weekAtNow?: number;
  /** A contraction currently being timed, not yet in `entries`. */
  inProgressStartedAt?: number;
}

export interface Assess511Result {
  /**
   * `"5-1-1"` — term (≥ 37 weeks, or week unknown): time to call the sanatorio.
   * `"preterm"` — the same regular pattern before 37 weeks: an alarm sign, and
   * the screen renders it as one (`CONTRACTIONS_PRETERM_ALERT`).
   */
  pattern: "5-1-1" | "preterm";
}

const WINDOW_MS = 60 * 60 * 1000;
const MIN_COUNT = 6;
const MAX_AVG_INTERVAL_SEC = 5 * 60;
const MIN_MEDIAN_DURATION_SEC = 45;
/**
 * Term, for this module: from this week on a regular pattern is the 5-1-1
 * hint; before it, the same pattern is the preterm alert — see the module
 * note above.
 */
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

  // The week decides which answer, never whether there is one: see the module
  // note — a regular pattern before term is the alarm, not the silence.
  const preterm =
    options.weekAtNow !== undefined && options.weekAtNow < MIN_WEEK_FOR_HINT;
  return { pattern: preterm ? "preterm" : "5-1-1" };
}

/**
 * es-PY voseo, jopara `gn` draft — pending native review (D6, see
 * `docs/GUARANI-REVIEW.md`). Never "todo está bien": the pattern is a reason
 * to call, not a diagnosis.
 */
export const CONTRACTIONS_511_HINT: BilingualText = {
  es: "Tus contracciones llegan cada 5 minutos y duran cerca de 1 minuto, así desde hace una hora: es momento de llamar a tu hospital o sanatorio.",
  gn: "Ne contracción ou 5 minuto-gui 5 minuto-pe ha ipuku peteĩ minuto rupi, peteĩ hora guive: ko'ág̃a ehenói ne hospital térã sanatorio.",
};

/**
 * The preterm alert (`pattern: "preterm"`), same es-PY voseo / jopara `gn`
 * draft status as the hint above — pending native review (D6). The Guaraní
 * reuses the "tereho pe guardia" phrasing `lib/emergency.ts` already carries.
 * Unlike the term hint this one does not wait for her sanatorio's number: the
 * screen pairs it with a link to /emergencia and a tap-to-call 141.
 */
export const CONTRACTIONS_PRETERM_ALERT: BilingualText = {
  es: "Contracciones regulares antes de las 37 semanas: llamá a tu médico/a o andá a la guardia ahora.",
  gn: "Contracción ou jepive 37 semana mboyve: ehenói ne médico/a-pe térã tereho ko'ág̃a pe guardia-pe.",
};
