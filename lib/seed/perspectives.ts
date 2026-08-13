import { PerspectiveBandSchema, validateContentArray } from "../content/schemas";
import { publishedOnly } from "./gate";
import type { PerspectiveBand } from "../types";
import rawBands from "./perspectives.json";

// BUILD-PLAN C4 — the perspective switcher (feature map #13).
//
// The same week, three entrances: para vos · para tu pareja · para la familia.
// A pregnancy app that only ever addresses the pregnant person leaves the two
// people most likely to be reading over her shoulder with nothing to do, and
// "no sabía qué hacer" is the most common thing partners say afterwards.
//
// Content is stored as **week ranges**, and the narrowest range containing a
// week wins. Seven bands of real writing ship today; a later content pass can
// override any single week by adding `{fromWeek: 24, toWeek: 24, ...}`, with
// no code change. See DECISIONS.md "C4" for why that beat 126 per-week strings.

const { valid, errors } = validateContentArray(
  "lib/seed/perspectives.json",
  rawBands as unknown[],
  PerspectiveBandSchema,
  (band) => `${band.fromWeek}-${band.toWeek}`,
);
if (errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/perspectives.json:\n${errors.join("\n")}`,
  );
}

export const PUBLISHED_PERSPECTIVES: PerspectiveBand[] = publishedOnly(valid);

/**
 * The narrowest band covering `week`, or `null`.
 *
 * Exported separately from the shipped content so the selection rule — which
 * is the whole content-deepening story and is invisible until someone adds an
 * override — can be tested directly instead of re-implemented in a test.
 * Equal widths keep the first, which makes the file's order the tiebreak rather
 * than something nobody can see.
 */
export function selectBand(
  bands: readonly PerspectiveBand[],
  week: number,
): PerspectiveBand | null {
  let best: PerspectiveBand | null = null;
  for (const band of bands) {
    if (week < band.fromWeek || week > band.toWeek) continue;
    if (best === null || band.toWeek - band.fromWeek < best.toWeek - best.fromWeek) {
      best = band;
    }
  }
  return best;
}

/** The three perspectives on a week, or `null` when no band covers it. */
export function perspectivesFor(week: number): PerspectiveBand | null {
  return selectBand(PUBLISHED_PERSPECTIVES, week);
}
