// Screen text for the checklist's view by trimester (/herramientas/checklist).
// The items themselves are the week tips in lib/weeks.ts. docs/CONTENT-COUNTRY-RULE.md §3.

import type { Trimester } from "../../types";

export const CHECKLIST_TRIMESTER_COPY = {
  title: "Por trimestre",
  intro: "Lo que cada semana te propone hacer, juntado por trimestre. Tocá una para leer la semana.",
  filterLabel: "Trimestre",
  /** "Semana 20" */
  week: (week: number) => `Semana ${week}`,
} as const;

export const TRIMESTER_LABELS: Record<Trimester, string> = {
  1: "Primer trimestre",
  2: "Segundo trimestre",
  3: "Tercer trimestre",
};

/** Short names for the chips. */
export const TRIMESTER_CHIPS: Record<Trimester, string> = {
  1: "Primero",
  2: "Segundo",
  3: "Tercero",
};
