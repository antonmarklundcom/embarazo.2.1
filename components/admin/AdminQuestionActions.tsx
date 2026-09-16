"use client";

import { useActionState, useEffect, useState } from "react";

import {
  answerQuestion,
  declineQuestion,
  type AdminActionState,
} from "@/app/admin/actions";
import {
  suggestDraft,
  type DraftActionState,
} from "@/app/admin/preguntas/actions";
import { ANSWER_MAX, ANSWER_MIN } from "@/lib/community/questions";

// K20 — the controls on one queued question.
//
// The answer box and the "no publicar" button are separate forms rather than
// one form with two submit buttons, so declining cannot carry a half-written
// answer along with it, and a stray Enter in the textarea cannot reject
// anything.
//
// U9 adds a third, optional form: "Sugerir borrador". `draftStatus` is
// `undefined` unless the caller explicitly computed an answer for a pending
// question, which is what keeps a deployment with no `GEMINI_API_KEY`
// rendering this component identically to before the feature existed — no
// button, no placeholder, no extra DOM at all.

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
  question,
  answer,
  draftStatus,
}: {
  questionId: string;
  /** The question text, needed only to offer a draft suggestion for it. */
  question?: string;
  /** The existing answer, when this is a published question being corrected. */
  answer?: string | null;
  /**
   * `"available"` shows the "Sugerir borrador" button; `"capped"` shows why
   * it is not offered right now. Leaving this `undefined` — the feature
   * disabled, or this is not a pending question — renders nothing extra.
   */
  draftStatus?: "available" | "capped";
}) {
  const [answerValue, setAnswerValue] = useState(answer ?? "");
  const [answerState, submitAnswer, answering] = useActionState<
    AdminActionState,
    FormData
  >(answerQuestion, {});
  const [declineState, submitDecline, declining] = useActionState<
    AdminActionState,
    FormData
  >(declineQuestion, {});
  const [draftState, submitDraft, drafting] = useActionState<
    DraftActionState,
    FormData
  >(suggestDraft, {});

  // The draft replaces whatever is in the textarea rather than merging with
  // it — it is a suggestion for an empty pending question, not a patch onto
  // something the admin already started writing.
  useEffect(() => {
    if (draftState.draft) setAnswerValue(draftState.draft);
  }, [draftState.draft]);

  return (
    <div className="mt-3 space-y-3">
      <form action={submitAnswer}>
        <input type="hidden" name="questionId" value={questionId} />
        <label className="block text-xs font-extrabold uppercase tracking-[1.2px] text-petrol">
          Respuesta
        </label>
        {draftState.draft && (
          <p className="mt-1 text-xs font-semibold text-petrol">
            Borrador generado por IA — revisá antes de publicar.
          </p>
        )}
        <textarea
          name="answer"
          rows={4}
          value={answerValue}
          onChange={(event) => setAnswerValue(event.target.value)}
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

      {draftStatus === "available" && (
        <form action={submitDraft}>
          <input type="hidden" name="questionId" value={questionId} />
          <input type="hidden" name="question" value={question ?? ""} />
          <button
            type="submit"
            disabled={drafting}
            className="text-xs font-semibold text-petrol underline disabled:opacity-40"
          >
            {drafting ? "Generando borrador…" : "Sugerir borrador"}
          </button>
          {draftState.error && (
            <p className="mt-1 text-xs font-semibold text-terracotta">
              {draftState.error}
            </p>
          )}
        </form>
      )}

      {draftStatus === "capped" && (
        <p className="text-xs text-muted">
          Ya se generaron los borradores disponibles hoy. Podés escribir la
          respuesta vos misma.
        </p>
      )}

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
