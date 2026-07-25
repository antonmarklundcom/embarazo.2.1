// Mandatory component (build spec §3). Renders "Revisado por {reviewer}".
//
// BUILD-PLAN Z2: when no reviewer is configured this used to fall back to
// "el equipo médico de Mi Bebé" — a claim that content had been medically
// reviewed when nobody had reviewed it. That is worse than showing nothing, so
// the byline now renders only when a real reviewer is set. `lib/launchChecks`
// additionally fails any deployment build that leaves it unset.
import { isPlaceholderReviewer } from "@/lib/launchChecks";

const REVIEWER = process.env.NEXT_PUBLIC_MEDICAL_REVIEWER;

export function MedicalReviewByline() {
  if (isPlaceholderReviewer(REVIEWER)) return null;

  return <p className="text-xs text-muted">Revisado por {REVIEWER}</p>;
}
