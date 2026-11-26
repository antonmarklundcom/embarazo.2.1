"use client";

import { useEffect, useMemo, useState } from "react";

import { useFlag } from "@/lib/flags/useFlag";
import { PREGUNTA_COPY } from "@/lib/i18n/es-PY/pregunta";
import {
  POLL_MIN_ANSWERS,
  PollResultsSchema,
  countsFor,
  percentages,
  questionForDay,
  readAnswers,
  saveAnswer,
  type PollResults,
} from "@/lib/poll/dailyPoll";
import type { Trimester } from "@/lib/types";

// "Pregunta del día" — one light question on Hoy, between "Tip de hoy" and the
// mood check-in, and how other mamás in her trimester answered it.
//
// Behind the `preguntaDelDia` flag (off by default): off renders nothing and
// sends nothing. On, a tap:
//   1. keeps her answer on this device (`mibebe.pregunta.respuestas`), so a
//      second visit the same day shows the answered state and she can never
//      answer the same question twice from this phone;
//   2. sends ONE anonymous count to POST /api/v1/poll, with her week, the way
//      a guía view is counted (components/RecordContentView.tsx). Like that
//      recorder it sends once and does not retry: offline, the count is lost
//      and her answer is still saved and shown;
//   3. reads GET /api/v1/poll/<id>, which carries nothing about her, and shows
//      the bars only when her trimester has at least POLL_MIN_ANSWERS answers.
//
// Compact on purpose (the "Hoy" block has four things now): two answer columns
// at a fixed height whatever the question, and thin bars for the results.
export function DailyQuestionCard({ week, trimester }: { week: number; trimester: Trimester }) {
  const enabled = useFlag("preguntaDelDia");
  // Fixed for the visit: a card that changed its question at midnight under
  // her thumb would be stranger than one that waits for the next visit.
  const question = useMemo(() => questionForDay(new Date()), []);
  const [answer, setAnswer] = useState<string | undefined>(() =>
    question && typeof window !== "undefined" ? readAnswers()[question.id] : undefined,
  );
  const [results, setResults] = useState<PollResults | null>(null);

  // Read the results once she has answered, including when she comes back.
  useEffect(() => {
    if (!enabled || !question || answer === undefined || results) return;
    const controller = new AbortController();
    void fetch(`/api/v1/poll/${question.id}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => {
        const parsed = PollResultsSchema.safeParse(body);
        if (parsed.success && parsed.data.questionId === question.id) setResults(parsed.data);
      })
      // Offline or a failure: the thank-you line stays.
      .catch(() => {});
    return () => controller.abort();
  }, [enabled, question, answer, results]);

  if (!enabled || !question) return null;

  function choose(optionKey: string) {
    if (!question || answer !== undefined) return;
    // `false` means this device had already answered: nothing is sent.
    const fresh = saveAnswer(question.id, optionKey);
    setAnswer(optionKey);
    if (!fresh) return;
    void fetch("/api/v1/poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, optionKey, week }),
      keepalive: true,
    }).catch(() => {});
  }

  const keys = question.options.map((option) => option.key);
  const { counts, total } = countsFor(results, trimester);
  const showResults = answer !== undefined && total >= POLL_MIN_ANSWERS;
  const shares = showResults ? percentages(counts, keys) : null;

  return (
    <section aria-labelledby="pregunta-del-dia" className="rounded-card border border-line bg-white p-4">
      <p id="pregunta-del-dia" className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        {PREGUNTA_COPY.title}
      </p>
      <p className="mt-1.5 text-[15px] font-extrabold leading-snug text-ink">{question.text}</p>

      {shares ? (
        <div className="mt-3">
          <p className="text-[12px] font-extrabold text-petrol">{PREGUNTA_COPY.resultsTitle}</p>
          <ul className="mt-2 space-y-2" data-poll-results>
            {question.options.map((option) => {
              const mine = option.key === answer;
              const share = shares[option.key] ?? 0;
              return (
                <li key={option.key} data-poll-option={option.key}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px] leading-tight">
                    <span className={mine ? "font-extrabold text-ink" : "font-semibold text-ink"}>
                      {option.label}
                      {mine && <span className="font-semibold text-petrol"> · {PREGUNTA_COPY.yourAnswer}</span>}
                    </span>
                    <span className="font-extrabold tabular-nums text-ink" data-poll-share>
                      {share}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-pastel-arena" aria-hidden>
                    <div
                      className={`h-full rounded-full ${mine ? "bg-petrol" : "bg-terracotta/60"}`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <>
          <div role="group" aria-label={PREGUNTA_COPY.optionsLabel} className="mt-3 grid grid-cols-2 gap-2">
            {question.options.map((option) => {
              const mine = option.key === answer;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => choose(option.key)}
                  aria-pressed={mine}
                  disabled={answer !== undefined && !mine}
                  className={`min-h-[44px] rounded-xl border px-2.5 py-1 text-[13px] font-bold leading-tight transition active:scale-[0.98] ${
                    mine
                      ? "border-petrol bg-petrol text-white"
                      : "border-line bg-white text-ink disabled:opacity-60"
                  }`}
                >
                  {option.label}
                  {mine && <span className="sr-only"> ({PREGUNTA_COPY.yourAnswer})</span>}
                </button>
              );
            })}
          </div>
          {answer !== undefined && (
            <p role="status" className="mt-2.5 text-[13px] font-semibold leading-snug text-petrol">
              {PREGUNTA_COPY.thanks}
            </p>
          )}
        </>
      )}
    </section>
  );
}
