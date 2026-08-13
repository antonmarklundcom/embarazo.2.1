"use client";

import { useEffect, useRef, useState } from "react";

import {
  KEGEL_LEVELS,
  formatDuration,
  kegelSessionSeconds,
  kegelStepAt,
  type KegelLevel,
} from "@/lib/tools/kegel";

// BUILD-PLAN D2 — Kegel (feature map #21).
//
// The session is driven by wall-clock elapsed time, not by a countdown that
// decrements: a phone that locks the screen throttles timers, and a woman who
// unlocks it mid-session should see where she actually is rather than where the
// timer stopped. `kegelStepAt` is pure and tested; this screen only draws it.

const PHASE_COPY = {
  hold: { title: "Apretá", tone: "bg-pastel-rosa" },
  rest: { title: "Soltá", tone: "bg-pastel-celeste" },
  done: { title: "Listo", tone: "bg-pastel-salvia" },
} as const;

export default function KegelPage() {
  const [level, setLevel] = useState<KegelLevel>(KEGEL_LEVELS[0]!);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (startedAt === null) return;
    startRef.current = startedAt;
    const id = window.setInterval(() => {
      const from = startRef.current;
      if (from !== null) setElapsed(Math.floor((Date.now() - from) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const step = kegelStepAt(level, elapsed);
  const running = startedAt !== null && step.phase !== "done";
  const phase = PHASE_COPY[step.phase];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Ejercicios de Kegel</h1>
        <p className="text-sm text-muted">
          Fortalecen el piso pélvico. Ayudan con las pérdidas de pis del
          embarazo y con la recuperación después del parto.
        </p>
      </header>

      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Nivel
        </h2>
        <div className="mt-2.5 flex gap-2">
          {KEGEL_LEVELS.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={running}
              onClick={() => {
                setLevel(option);
                setStartedAt(null);
                setElapsed(0);
              }}
              className={`min-h-[36px] flex-1 rounded-tile px-3 text-[13px] font-extrabold transition disabled:opacity-50 ${
                option.id === level.id
                  ? "bg-pastel-lavanda text-ink"
                  : "bg-pastel-arena/50 text-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">{level.description}</p>
        <p className="mt-1 text-sm font-bold text-muted">
          {level.repetitions} repeticiones · {level.holdSeconds} s apretando ·{" "}
          {level.restSeconds} s descansando · {formatDuration(kegelSessionSeconds(level))} en
          total
        </p>
      </section>

      <section
        className={`rounded-card p-6 text-center transition-colors ${phase.tone}`}
        aria-live="polite"
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          {startedAt === null
            ? "Cuando estés lista"
            : `Repetición ${step.repetition} de ${level.repetitions}`}
        </p>
        <p className="mt-1 text-4xl font-black text-ink">
          {startedAt === null ? "Empezá" : phase.title}
        </p>
        <p className="mt-1 text-2xl font-black text-ink/70">
          {startedAt === null || step.phase === "done" ? "" : `${step.remaining}`}
        </p>
      </section>

      <button
        type="button"
        onClick={() => {
          if (startedAt === null || step.phase === "done") {
            setElapsed(0);
            setStartedAt(Date.now());
          } else {
            setStartedAt(null);
            setElapsed(0);
          }
        }}
        className="min-h-[48px] w-full rounded-tile bg-terracotta px-4 py-3 text-sm font-extrabold text-white transition active:scale-[0.99]"
      >
        {startedAt === null
          ? "Empezar"
          : step.phase === "done"
            ? "Hacerlo de nuevo"
            : "Parar"}
      </button>

      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="text-base font-extrabold text-ink">Cómo se hacen</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink/90">
          <li>
            Apretá como si quisieras aguantar el pis, sin apretar la panza, los
            glúteos ni las piernas.
          </li>
          <li>Seguí respirando normal: si aguantás el aire, no lo estás haciendo bien.</li>
          <li>Soltá del todo entre una y otra. El descanso es parte del ejercicio.</li>
          <li>Podés hacerlos sentada, acostada de costado o parada, donde estés.</li>
        </ol>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          No los hagas mientras hacés pis: eso sí puede hacerte mal. Si tenés
          dolor, sangrado o te indicaron reposo, consultá antes en tu control.
        </p>
      </section>
    </div>
  );
}
