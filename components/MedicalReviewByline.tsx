// Mandatory component (build spec §3). Renders "Revisado por {reviewer}" when
// a real reviewer is configured, or a generic disclaimer otherwise.
//
// 2026-09 — DECISIONS.md "disclaimer model, not a named reviewer". This used
// to render null when no reviewer was set, and `lib/launchChecks` failed any
// deployment build that left it unset — recruiting a gineco-obstetra became a
// prerequisite for shipping at all. The honest alternative is to say plainly
// that this content has not been professionally reviewed, the same way a
// medication package insert or a public-health pamphlet does, rather than
// block the build on a signature. This disclaimer is unconditional: it is not
// a substitute for review, it is what a page says in the absence of it.
import { isPlaceholderReviewer } from "@/lib/launchChecks";

const REVIEWER = process.env.NEXT_PUBLIC_MEDICAL_REVIEWER;

export function MedicalReviewByline() {
  if (isPlaceholderReviewer(REVIEWER)) {
    return (
      <p className="text-xs text-muted">
        Contenido informativo, no reemplaza la consulta con tu médico u
        obstetra.
      </p>
    );
  }

  return <p className="text-xs text-muted">Revisado por {REVIEWER}</p>;
}
