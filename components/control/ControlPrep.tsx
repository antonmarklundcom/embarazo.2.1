"use client";

import { useState } from "react";

import {
  CONTROL_QUESTIONS,
  MAX_OWN_QUESTIONS,
  MAX_QUESTION_LENGTH,
  questionsForWeek,
  type ControlPicks,
  type RecentSummary,
} from "@/lib/controlPrep";
import { daysUntil, formatAppointment } from "@/lib/appointments";

// "Preparar mi control" — the interactive half (never printed) and the two
// printed sections it feeds. See `lib/controlPrep.ts` for why these are
// questions and never answers.

function whenLabel(at: number, now: number): string {
  const days = daysUntil(at, now);
  if (days < 0) return "ya pasó — anotá la fecha del próximo en Hoy";
  if (days === 0) return "es hoy";
  if (days === 1) return "es mañana";
  return `en ${days} días`;
}

export function ControlPrepPanel({
  week,
  nextAppointment,
  picks,
  onChange,
}: {
  week: number | undefined;
  nextAppointment: number | undefined;
  picks: ControlPicks;
  onChange: (next: ControlPicks) => void;
}) {
  const [draft, setDraft] = useState("");
  const [now] = useState(() => Date.now());
  const suggestions = week !== undefined ? questionsForWeek(week) : [];

  function toggle(id: string) {
    const picked = picks.picked.includes(id)
      ? picks.picked.filter((p) => p !== id)
      : [...picks.picked, id];
    onChange({ ...picks, picked });
  }

  function addOwn() {
    const text = draft.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!text || picks.own.length >= MAX_OWN_QUESTIONS) return;
    onChange({ ...picks, own: [...picks.own, text] });
    setDraft("");
  }

  function removeOwn(index: number) {
    onChange({ ...picks, own: picks.own.filter((_, i) => i !== index) });
  }

  return (
    <section
      aria-labelledby="preparar-control"
      className="no-print space-y-3 rounded-card bg-white p-4 shadow-soft"
    >
      <div>
        <h2 id="preparar-control" className="text-lg font-black text-ink">
          Preparar mi control
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          {nextAppointment
            ? `Tu próximo control: ${formatAppointment(nextAppointment)} — ${whenLabel(nextAppointment, now)}.`
            : "Marcá lo que querés preguntar. Lo que elijas sale en la hoja de abajo."}
        </p>
      </div>

      {suggestions.length > 0 && (
        <fieldset>
          <legend className="text-xs font-extrabold uppercase tracking-[1.6px] text-petrol">
            Preguntas para la semana {week}
          </legend>
          <ul className="mt-2 space-y-1.5">
            {suggestions.map((q) => {
              const checked = picks.picked.includes(q.id);
              return (
                <li key={q.id}>
                  <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-tile border border-line px-3 py-2.5 text-sm text-ink has-[:checked]:border-petrol/40 has-[:checked]:bg-pastel-salvia/60">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(q.id)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-petrol)]"
                    />
                    <span>{q.text}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <div>
        <label htmlFor="own-question" className="text-xs font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tus preguntas
        </label>
        {picks.own.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {picks.own.map((q, i) => (
              <li
                key={`${i}-${q}`}
                className="flex items-start justify-between gap-2 rounded-tile bg-cream px-3 py-2 text-sm text-ink"
              >
                <span className="pt-2.5">{q}</span>
                <button
                  type="button"
                  onClick={() => removeOwn(i)}
                  aria-label={`Quitar: ${q}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-ink/60"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {picks.own.length < MAX_OWN_QUESTIONS && (
          <div className="mt-2 flex gap-2">
            <input
              id="own-question"
              type="text"
              value={draft}
              maxLength={MAX_QUESTION_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOwn();
                }
              }}
              placeholder="Escribí algo que no te querés olvidar"
              className="min-h-[44px] min-w-0 flex-1 rounded-tile border border-black/10 bg-white px-3 text-sm focus:border-petrol focus:outline-none"
            />
            <button
              type="button"
              onClick={addOwn}
              disabled={!draft.trim()}
              className="min-h-[44px] rounded-tile bg-petrol px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted">
          Quedan solo en este teléfono. Se borran con «Borrar todos mis datos».
        </p>
      </div>
    </section>
  );
}

/** Printed: the questions she picked plus her own, in that order. */
export function ControlQuestionsReport({ picks }: { picks: ControlPicks }) {
  const picked = CONTROL_QUESTIONS.filter((q) => picks.picked.includes(q.id));
  if (picked.length === 0 && picks.own.length === 0) return null;
  return (
    <section className="space-y-1 break-inside-avoid">
      <h3 className="text-sm font-extrabold uppercase tracking-[1.6px] text-petrol">
        Preguntas para esta consulta
      </h3>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
        {picked.map((q) => (
          <li key={q.id}>{q.text}</li>
        ))}
        {picks.own.map((q, i) => (
          <li key={`own-${i}`}>{q}</li>
        ))}
      </ol>
    </section>
  );
}

/** Printed: the last four weeks, organised and never interpreted. */
export function RecentReport({ summary }: { summary: RecentSummary }) {
  return (
    <section className="space-y-1 break-inside-avoid">
      <h3 className="text-sm font-extrabold uppercase tracking-[1.6px] text-petrol">
        Últimas 4 semanas
      </h3>
      {summary.empty ? (
        <p className="text-sm text-muted">Sin registros en las últimas 4 semanas.</p>
      ) : (
        <ul className="space-y-0.5 text-sm text-ink">
          {summary.weight && (
            <li>
              Peso: {summary.weight.from} kg → {summary.weight.to} kg (
              {summary.weight.diff >= 0 ? "+" : ""}
              {summary.weight.diff} kg)
            </li>
          )}
          {summary.topSymptoms.length > 0 && (
            <li>
              Síntomas anotados:{" "}
              {summary.topSymptoms.map(([s, n]) => `${s} (${n})`).join(", ")}
            </li>
          )}
          {summary.lowMoodDays > 0 && (
            <li>
              Días con ánimo «mal» o «muy mal»: {summary.lowMoodDays}
            </li>
          )}
          {summary.kickSessions > 0 && <li>Sesiones de pataditas: {summary.kickSessions}</li>}
          {summary.contractions > 0 && (
            <li>Contracciones registradas: {summary.contractions}</li>
          )}
        </ul>
      )}
    </section>
  );
}
