import { ObstetraNoteSchema, validateContentArray } from "../content/schemas";
import { publishedOnly } from "./gate";
import type { ObstetraNote } from "../types";
import rawNotes from "./obstetraNotes.json";

// BUILD-PLAN C5 — "de la obstetra" (feature map #14).
//
// One short, practical note per week, written in the voice of the gineco-obstetra
// whose name appears on the card. Content is deliberately about the Paraguayan
// prenatal calendar — the laboratorio inicial, the 11–14 and 18–22 ecografías,
// the 24–28 curva de azúcar, dTpa at 27–36, estreptococo B at 35–37, the carné
// perinatal — because that is the thing a translated global app cannot get right.
//
// **These 42 strings are drafts awaiting a signature.** The card renders only
// when `NEXT_PUBLIC_MEDICAL_REVIEWER` is set (see `components/ObstetraCard.tsx`),
// which is Z2's standing rule: never claim a review that has not happened. Until
// the founder has a reviewer, nothing here reaches a user — and when she does,
// signing off on these is part of what she is agreeing to.

const { valid, errors } = validateContentArray(
  "lib/seed/obstetraNotes.json",
  rawNotes as unknown[],
  ObstetraNoteSchema,
  (entry) => String(entry.week),
);
if (errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/obstetraNotes.json:\n${errors.join("\n")}`,
  );
}

export const PUBLISHED_OBSTETRA_NOTES: ObstetraNote[] = publishedOnly(valid);

const BY_WEEK = new Map(PUBLISHED_OBSTETRA_NOTES.map((entry) => [entry.week, entry.note]));

/** The note for a week, or `null` when there isn't one. */
export function obstetraNote(week: number): string | null {
  return BY_WEEK.get(week) ?? null;
}
