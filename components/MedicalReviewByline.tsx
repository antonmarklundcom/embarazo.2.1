// Mandatory component (build spec §3). Renders "Revisado por …" only for text a
// registered reviewer approved, or a generic disclaimer otherwise.
//
// 2026-09 — DECISIONS.md "disclaimer model, not a named reviewer". This used
// to render null when no reviewer was set, and `lib/launchChecks` failed any
// deployment build that left it unset — recruiting a gineco-obstetra became a
// prerequisite for shipping at all. The honest alternative is to say plainly
// that this content has not been professionally reviewed, the same way a
// medication package insert or a public-health pamphlet does, rather than
// block the build on a signature. This disclaimer is unconditional: it is not
// a substitute for review, it is what a page says in the absence of it.
//
// 2026-10 — F22. The named byline used to come from one build-time variable,
// `NEXT_PUBLIC_MEDICAL_REVIEWER`, on every screen that renders this — fifteen
// of them — whether or not that person had read the screen. A name now comes
// only from `lib/seed/approvals.json`: the caller resolves the review for the
// exact text it renders (`shippedReviewFor(contentId, text)`, ideally in a
// server component) and passes it in. No review, a stale one, or none passed:
// the disclaimer. The variable no longer has any effect here.
//
// The lookup stays out of this component on purpose: it is mounted on client
// pages (contracciones, pataditas…) that otherwise ship no zod, and importing
// the validated registry here added ~33 kB to their first load.
import { formatReviewDate, type ShownReview } from "@/lib/content/approvals";

export function MedicalReviewByline({
  review = null,
}: {
  /** From `shippedReviewFor(contentId, text)`; omit where no approval applies. */
  review?: ShownReview | null;
} = {}) {
  if (!review) {
    return (
      <p className="text-xs text-muted">
        Contenido informativo, no reemplaza la consulta con tu médico u
        obstetra.
      </p>
    );
  }

  return (
    <p className="text-xs text-muted">
      Revisado por {review.reviewerName}, {review.profession}, el{" "}
      {formatReviewDate(review.reviewedAt)}
    </p>
  );
}
