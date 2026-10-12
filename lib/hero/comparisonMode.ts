/** Reuses the existing non-sensitive showComparison preference in the profile. */
export type ComparisonMode = "fruits" | "measures";
export function comparisonMode(value: unknown): ComparisonMode {
  return value === false ? "measures" : "fruits";
}
export function comparisonVisible(mode: ComparisonMode): boolean { return mode === "fruits"; }
