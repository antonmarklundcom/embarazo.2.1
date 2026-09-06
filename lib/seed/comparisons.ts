import { ComparisonSchema, validateContentArray } from "../content/schemas";
import type { Comparison } from "../content/schemas";
import rawComparisons from "./comparisons.json";

// U7 — how big the week's fruit actually is.
//
// `lib/weeks.ts` has carried the WORDS ("del tamaño de una mandioca") since the
// investor MVP. This file adds only the number behind them, so the hero can
// draw the baby and the item at proportionally correct relative scale instead
// of as two same-sized icons — which is what every other pregnancy app does,
// and what makes "una semilla de amapola" carry no size information at all.
//
// Deliberately NOT run through `publishedOnly()`, unlike the directory and the
// sponsors. That gate exists for invented businesses with dead phone numbers,
// where rendering a placeholder is a trust failure. A chía seed is 0.2 cm in
// any market; there is no placeholder here to hide and nothing to go stale.

const { valid, errors } = validateContentArray(
  "lib/seed/comparisons.json",
  rawComparisons as unknown[],
  ComparisonSchema,
  (entry) => String(entry.week),
);
if (errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/comparisons.json:\n${errors.join("\n")}`,
  );
}

export const COMPARISONS: Comparison[] = valid;

const BY_WEEK = new Map(COMPARISONS.map((entry) => [entry.week, entry]));

/** The comparison item for a week, or null (weeks 1–2 have no embryo). */
export function comparisonFor(week: number): Comparison | null {
  return BY_WEEK.get(week) ?? null;
}
