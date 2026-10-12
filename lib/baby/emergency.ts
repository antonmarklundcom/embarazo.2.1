import { babyAge, babyAgeLabel } from "./age";

// General education adapted from MSPBS's 2025 maternal/newborn alarm guide.
// These are reasons to seek care, never a diagnosis or a reason to wait.
// No professional review is claimed; the source stays visible on the screen.
export const MATERNAL_NEWBORN_ALARM_SOURCE =
  "https://www.mspbs.gov.py/dependencias/progsalud/adjunto/0f9d94-OrientacionessobresignosdealarmaenembarazadaspurperasyrecinnacidosAO2025.pdf";

export const POSTPARTUM_ALARM_SIGNS: readonly string[] = [
  "Sangrado vaginal abundante o que aumenta de repente",
  "Dolor de cabeza intenso, visión alterada, desmayo o convulsiones",
  "Fiebre, escalofríos o flujo vaginal con olor desagradable",
  "Pechos muy doloridos, rojos o calientes",
  "Tristeza o angustia que te impide cuidarte o atender a tu bebé",
];

export const AFTER_BIRTH_CALL_STEPS: readonly string[] = [
  "Decí dónde estás: ciudad, barrio y una referencia.",
  "Explicá si los síntomas son tuyos o de tu bebé, qué notás y desde cuándo.",
  "Si están a mano, tené la libreta de tu bebé o tus documentos de atención. No demores la llamada para buscarlos.",
];

/** Two scripts: say whose symptoms they are, never describe an ongoing pregnancy. */
export function postpartumCallContext(birthDate: number, now = Date.now()): {
  mother: string;
  baby: string;
} {
  const age = babyAge(birthDate, now);
  // For a young infant, 10 days is more useful on a call than the rounded "1 semana".
  const days = `${age.days} ${age.days === 1 ? "día" : "días"}`;
  const ageLabel = age.days < 90 ? days : babyAgeLabel(age);
  return {
    mother: age.days === 0 ? "Di a luz hoy." : `Di a luz hace ${ageLabel}.`,
    baby: `Mi bebé tiene ${ageLabel}.`,
  };
}
