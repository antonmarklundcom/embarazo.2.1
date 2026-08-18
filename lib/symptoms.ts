// The symptom vocabulary the daily check-in offers.
//
// Extracted from `app/(app)/herramientas/sintomas/page.tsx` by K9's F3: the
// insight logic has to reason about the same list the user picks from, and two
// copies of a vocabulary is how one of them quietly grows an option the other
// has never heard of.

export const SYMPTOMS = [
  "Náuseas",
  "Acidez",
  "Dolor de espalda",
  "Hinchazón",
  "Contracciones",
  "Antojos",
  "Insomnio",
  "Cansancio",
  "Otros",
] as const;

export type Symptom = (typeof SYMPTOMS)[number];

/**
 * Symptoms F3 will never write a sentence about.
 *
 * - **"Otros"** is a bucket, not a symptom: "tus otros aparecen los días que
 *   dormís mal" is nonsense, and worse, it is nonsense that looks like a
 *   finding.
 * - **"Contracciones"** is the one entry on this list that can be an alarm
 *   sign. A pattern line about contractions would read as reassurance about
 *   something whose whole safety story is "if they are regular before 37
 *   weeks, call". `/emergencia` owns that conversation; a trends card must not
 *   join it.
 */
export const NEVER_ANALYSED: readonly string[] = ["Otros", "Contracciones"];

export function isAnalysableSymptom(symptom: string): boolean {
  return (
    (SYMPTOMS as readonly string[]).includes(symptom) &&
    !NEVER_ANALYSED.includes(symptom)
  );
}
