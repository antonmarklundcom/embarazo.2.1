import {
  ApprovalSchema,
  ReviewerSchema,
  validateContentArray,
} from "../content/schemas";
import { reviewFor, type ApprovalRegistry, type ShownReview } from "../content/approvals";
import rawApprovals from "./approvals.json";
import rawReviewers from "./reviewers.json";

// F22 — the shipped review registry, validated once at import like every seed.
//
// `reviewers.json` says who may be named; `approvals.json` says which exact
// texts each of them signed and when (shapes in `lib/content/schemas.ts`, the
// rules in `lib/content/approvals.ts`). Both ship empty: nothing in the app has
// been professionally reviewed yet, so nothing renders as reviewed — whatever
// `NEXT_PUBLIC_MEDICAL_REVIEWER` says, which no longer grants anything.
//
// Adding an approval is a content edit made after a real sign-off: the
// reviewer's entry, the item's id, the date, and `contentHash` of the text they
// approved (`npm run validate:content` prints the hash it expects for any
// item that has an approval with a different one).

const reviewers = validateContentArray(
  "lib/seed/reviewers.json",
  rawReviewers as unknown[],
  ReviewerSchema,
);
const approvals = validateContentArray(
  "lib/seed/approvals.json",
  rawApprovals as unknown[],
  ApprovalSchema,
  (entry) => entry.contentId,
);
const errors = [...reviewers.errors, ...approvals.errors];
if (errors.length > 0) {
  throw new Error(`Registro de revisiones inválido:\n${errors.join("\n")}`);
}

export const REVIEW_REGISTRY: ApprovalRegistry = {
  reviewers: reviewers.valid,
  approvals: approvals.valid,
};

/** The review to show for this exact text, or `null` when it has none that is current. */
export function shippedReviewFor(contentId: string, text: string): ShownReview | null {
  return reviewFor(REVIEW_REGISTRY, contentId, text);
}
