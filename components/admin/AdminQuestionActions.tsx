"use client";

import { useActionState } from "react";

import {
  answerQuestion,
  declineQuestion,
  type AdminActionState,
} from "@/app/admin/actions";
import { ANSWER_MAX, ANSWER_MIN } from "@/lib/community/questions";

// K20 — the controls on one queued question.
//
// The answer box and the "no publicar" button are separate forms rather than
// one form with two submit buttons, so declining cannot carry a half-written
// answer along with it, and a stray Enter in the textarea cannot reject
// anything.

function Feedback({ state }: { state: AdminActionState }) {
  if (state.error) {
    return <p className="mt-2 text-sm font-semibold text-terracotta">{state.error}</p>;
  }
  if (state.ok) {
    return <p className="mt-2 text-sm font-semibold text-sage">{state.ok}</p>;
  }
  return null;
}

export function AdminQuestionActions({
  questionId,
  answer,
}: {
  questionId: string;
  /** The existing answer, when this is a published question being corrected. */
  answer?: string | null;
}) {
  const [answerState, submitAnswer, answering] = useActionState<
    AdminActionState,
    FormData
  >(answerQuestion, {});
  const [declineState, submitDecline, declining] = useActionState<
    AdminActionState,
    FormData
  >(declineQuestion, {});

  return (
    <div className="mt-3 space-y-3">
      <form action={submitAnswer}>
        <input type="hidden" name="questionId" value={questionId} />
        <label className="block text-xs font-extrabold uppercase tracking-[1.2px] text-petrol">
          Respuesta
        </label>
        <textarea
          name="answer"
          rows={4}
          defaultValue={answer ?? ""}
          minLength={ANSWER_MIN}
          maxLength={ANSWER_MAX}
          placeholder="Respondé como le hablarías a ella. Si la respuesta correcta es «consultá con tu médico», decilo así."
          className="mt-1 w-full rounded-tile border border-black/10 bg-cream/50 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-petrol focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={answering}
            className="rounded-tile bg-petrol px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            {answer ? "Actualizar y publicar" : "Responder y publicar"}
          </button>
          <span className="text-xs text-muted">
            Se publica sin el nombre de quien preguntó.
          </span>
        </div>
        <Feedback state={answerState} />
      </form>

      <form action={submitDecline}>
        <input type="hidden" name="questionId" value={questionId} />
        <button
          type="submit"
          disabled={declining}
          className="text-xs font-semibold text-muted underline disabled:opacity-40"
        >
          No publicar
        </button>
        <Feedback state={declineState} />
      </form>
    </div>
  );
}
