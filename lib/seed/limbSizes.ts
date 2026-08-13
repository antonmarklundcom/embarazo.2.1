import { LimbSizeSchema, validateContentArray } from "../content/schemas";
import { publishedOnly } from "./gate";
import type { LimbSize } from "../types";
import rawLimbSizes from "./limbSizes.json";

// BUILD-PLAN C3 — foot and hand sizes per week (feature map #12).
//
// The "tamaño" tab is served by `lib/weeks.ts`, which has carried
// `sizeComparison` + `lengthCm`/`weightG` since the investor MVP. This file
// adds only what did not exist: the two other ways the same week can be
// answered, "¿de qué tamaño tiene el pie?" and "¿y la mano?".
//
// Nothing before week 9 is listed, because before that there is no foot to
// measure. That is not a gap to fill later: `limbSize()` returns null, the tab
// does not render, and the card falls back to the single "tamaño" tab it has
// always been able to show.

const { valid, errors } = validateContentArray(
  "lib/seed/limbSizes.json",
  rawLimbSizes as unknown[],
  LimbSizeSchema,
  (entry) => String(entry.week),
);
if (errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/limbSizes.json:\n${errors.join("\n")}`,
  );
}

export const PUBLISHED_LIMB_SIZES: LimbSize[] = publishedOnly(valid);

const BY_WEEK = new Map(PUBLISHED_LIMB_SIZES.map((entry) => [entry.week, entry]));

/** The foot/hand figures for a week, or `null` when there are none. */
export function limbSize(week: number): LimbSize | null {
  return BY_WEEK.get(week) ?? null;
}

/**
 * "8,2 cm" — es-PY writes the decimal separator as a comma, and this is a
 * measurement a user reads aloud to somebody else.
 */
export function formatCm(cm: number): string {
  return `${cm.toFixed(1).replace(".", ",")} cm`;
}
