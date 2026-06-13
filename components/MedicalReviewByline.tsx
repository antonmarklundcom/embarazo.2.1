// Mandatory component (build spec §3). Renders "Revisado por {reviewer}".
const REVIEWER =
  process.env.NEXT_PUBLIC_MEDICAL_REVIEWER || "el equipo médico de Nido";

export function MedicalReviewByline() {
  return (
    <p className="text-xs text-muted">
      Revisado por {REVIEWER}
    </p>
  );
}
