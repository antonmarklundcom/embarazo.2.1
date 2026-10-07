import { ObstetraNoteSchema, validateContentArray } from "../content/schemas";
import {
  obstetraContentId,
  reviewFor,
  type ApprovalRegistry,
  type ShownReview,
} from "../content/approvals";
import { REVIEW_REGISTRY } from "./approvals";
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
// **These 42 strings are drafts awaiting a signature.** A week's note renders
// only when `lib/seed/approvals.json` holds a current approval of that exact
// text (F22, `approvedObstetraNote` below), signed by the reviewer who gave it —
// Z2's standing rule: never claim a review that has not happened. Until then
// nothing here reaches a user, and approving one week unlocks only that week.

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

/** The note for a week, or `null` when there isn't one. Says nothing about review. */
export function obstetraNote(week: number): string | null {
  return BY_WEEK.get(week) ?? null;
}

/**
 * The note for a week together with the review that lets it render, or `null`
 * when the week has no note or no current approval of its exact text.
 */
export function approvedObstetraNote(
  week: number,
  registry: ApprovalRegistry = REVIEW_REGISTRY,
): { note: string; review: ShownReview } | null {
  const note = obstetraNote(week);
  if (!note) return null;
  const review = reviewFor(registry, obstetraContentId(week), note);
  return review ? { note, review } : null;
}
