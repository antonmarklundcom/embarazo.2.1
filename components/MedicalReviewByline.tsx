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
// only from `lib/seed/approvals.json`: pass the `contentId` and the exact
// `text` the page renders, and the byline names the reviewer who approved that
// text, with the date. No `contentId`, no current approval, or text edited
// since: the disclaimer. The variable no longer has any effect here.
import { formatReviewDate } from "@/lib/content/approvals";
import { shippedReviewFor } from "@/lib/seed/approvals";

export function MedicalReviewByline({
  contentId,
  text,
}: {
  /** e.g. `guiaContentId(slug)`. Omit on screens no single approval covers. */
  contentId?: string;
  /** The clinical text this page renders, exactly; what the approval's hash pins. */
  text?: string;
} = {}) {
  const review = contentId && text ? shippedReviewFor(contentId, text) : null;

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
