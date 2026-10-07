import { FoodEntrySchema, validateContentArray, type FoodEntry } from "../content/schemas";
import { foodClinicalText, foodContentId, reviewFor } from "../content/approvals";
import { REVIEW_REGISTRY } from "./approvals";
import { reviewedOnly } from "./gate";
import rawFood from "./food.json";

// D3 — "¿Puedo comer...?" food lookup (BUILD-PLAN.md).
//
// Content lives in food.json (validated JSON, G1). Every entry ships with
// `reviewedBy` UNSET on purpose: none of this has been signed off by the
// medical reviewer yet, and an unreviewed entry must never render. This
// reuses the same gate *pattern* as the placeholder gate (lib/seed/gate.ts)
// rather than inventing a second mechanism — call sites only ever import
// PUBLISHED_FOOD, never FOOD directly.
const { valid, errors } = validateContentArray(
  "lib/seed/food.json",
  rawFood as unknown[],
  FoodEntrySchema,
);
if (errors.length > 0) {
  throw new Error(`Contenido inválido en lib/seed/food.json:\n${errors.join("\n")}`);
}

export const FOOD: FoodEntry[] = valid;

// F22: `reviewedBy` alone is a claim. An entry publishes only when that claim
// is backed by a current approval of its exact verdict text in
// `lib/seed/approvals.json`, so editing a reviewed verdict hides it again until
// it is re-approved (`npm run validate:content` reports the mismatch).
export const PUBLISHED_FOOD: FoodEntry[] = reviewedOnly(FOOD).filter(
  (entry) =>
    reviewFor(REVIEW_REGISTRY, foodContentId(entry.id), foodClinicalText(entry))?.reviewerName ===
    entry.reviewedBy,
);
