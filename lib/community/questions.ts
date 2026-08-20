import { z } from "zod";

// K20 (docs/FABLE-PLAN-2026-08.md §6, under §5 D5) — curated Q&A.
//
// Pure and dependency-free, like `lib/admin/audit.ts`, so the rules can be
// asserted without dragging `lib/server/*` (and therefore next-auth and MySQL)
// into the test runner. The route, the admin panel and the public page all
// import their vocabulary from here, which is what stops the length cap from
// being 500 in one file and 1000 in another.

/**
 * The three states a question can be in.
 *
 * `pending` is the default and the only state a user can put a row into.
 * **Nothing outside `approved` is ever public** — that is D5's whole promise,
 * and it is enforced in the query, not in the rendering: `approvedQuestions`
 * filters in SQL, so a page that forgot to check the status still cannot leak
 * one. `rejected` rows are kept rather than deleted so the submitter can be
 * told what happened; a question that silently vanishes reads as a bug, and
 * the woman who asked it asks it again.
 */
export const QUESTION_STATUSES = ["pending", "approved", "rejected"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

/**
 * Length bounds on the question.
 *
 * The minimum is not anti-spam, it is anti-*unanswerable*: "ayuda" cannot be
 * answered and produces a queue item that costs an admin a decision and gives
 * the asker nothing. The maximum is where a question stops being a question —
 * past a few hundred characters people are describing a case history, and a
 * curated FAQ is the wrong surface for that. Both numbers are told to the user
 * on the form rather than enforced silently.
 */
export const QUESTION_MIN = 15;
export const QUESTION_MAX = 400;

/** The admin's answer. Longer, because an answer may need to caveat itself. */
export const ANSWER_MIN = 15;
export const ANSWER_MAX = 1200;

/**
 * How many questions one account may submit per day.
 *
 * Low on purpose. This is not a forum: three unanswered questions in a queue
 * from the same person is already a support conversation, and the honest fix
 * for someone with more to ask is a reply, not a bigger allowance.
 */
export const QUESTIONS_PER_DAY = 3;

export const questionSchema = z
  .string()
  .trim()
  .min(QUESTION_MIN, `Contanos un poco más (al menos ${QUESTION_MIN} caracteres).`)
  .max(QUESTION_MAX, `Es muy largo — resumilo en ${QUESTION_MAX} caracteres.`);

export const answerSchema = z
  .string()
  .trim()
  .min(ANSWER_MIN)
  .max(ANSWER_MAX);

/** What the submitter is told about her own question, per state. */
export const STATUS_COPY: Record<
  QuestionStatus,
  { label: string; detail: string }
> = {
  pending: {
    label: "En revisión",
    detail:
      "La estamos leyendo. Si sirve para otras mamás, la respondemos y la publicamos sin tu nombre.",
  },
  approved: {
    label: "Respondida",
    detail: "La respondimos y ya está publicada acá abajo, sin tu nombre.",
  },
  rejected: {
    label: "No la publicamos",
    detail:
      "No la publicamos: puede ser algo muy personal para responder acá, o algo que necesita a tu médico. Si es urgente, mirá Emergencia.",
  },
};

/**
 * Is this row safe to render on a public screen?
 *
 * A function rather than `status === "approved"` written in four places: the
 * answer matters too. An approved row with no answer is a question the app
 * would publish unanswered — which is the exact shape of "public unreviewed
 * content" that D5 rules out, arrived at by accident instead of by design.
 */
export function isPublishable(row: {
  status: QuestionStatus;
  answer: string | null;
}): boolean {
  return row.status === "approved" && (row.answer?.trim().length ?? 0) > 0;
}
