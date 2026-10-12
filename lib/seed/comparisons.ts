import { ComparisonSchema, validateContentArray } from "../content/schemas";
import type { Comparison } from "../content/schemas";
import rawComparisons from "./comparisons.json";

// Familiar seeds/fruits help imagine growth, but neither fruit shape nor market
// size is a measurement. Repeated fruit labels are intentional. Clinical cm/g
// stay in weeks.ts; from week 20 these references suggest weight, not length.
const { valid, errors } = validateContentArray(
  "lib/seed/comparisons.json", rawComparisons as unknown[], ComparisonSchema,
  (entry) => String(entry.week),
);
if (errors.length > 0) throw new Error(errors.join("\n"));
export const COMPARISONS: Comparison[] = valid;
const BY_WEEK = new Map(COMPARISONS.map((entry) => [entry.week, entry]));
/** No fruit before week 4; week 3 is microscopic. Invalid/missing rows are null. */
export function comparisonFor(week: number): Comparison | null {
  return BY_WEEK.get(week) ?? null;
}
export function comparisonCaption(week: number): string | null {
  const row = comparisonFor(week);
  if (!row) return null;
  return row.basis === "weight"
    ? "Referencia de peso: " + row.item
    : "Referencia de longitud: " + row.item;
}
export const ILLUSTRATION_CAPTION = "Ilustración sin escala. Las frutas varían en tamaño y peso.";
