"use client";

import Link from "next/link";
import { useState } from "react";

import { PUBLISHED_EJERCICIOS } from "@/lib/seed/ejercicios";
import { useProfile } from "@/lib/useProfile";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import type { Trimester } from "@/lib/types";

// D6 — "Ejercicios" (feature map #22): images + text, no video.
//
// Same shape as K10's price guide and D3's food lookup: validated JSON,
// `publishedOnly()`, and an empty state that is a real state rather than a
// spinner — nothing renders until the founder drops real step images in.

const TRIMESTER_FILTERS: { value: Trimester | "todos"; label: string }[] = [
  { value: "todos", label: "Todas" },
  { value: 1, label: "1er trimestre" },
  { value: 2, label: "2do trimestre" },
  { value: 3, label: "3er trimestre" },
];

export default function EjerciciosPage() {
  const profile = useProfile();
  const [filter, setFilter] = useState<Trimester | "todos">(profile.trimester ?? "todos");

  const exercises =
    filter === "todos"
      ? PUBLISHED_EJERCICIOS
      : PUBLISHED_EJERCICIOS.filter((e) => e.trimesters.includes(filter));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Ejercicios</h1>
        <p className="mt-1 text-sm text-muted">
          Ejercicios suaves para el embarazo, paso a paso. Fijate siempre en
          &ldquo;cuándo evitarlo&rdquo; antes de empezar.
        </p>
      </header>

      {PUBLISHED_EJERCICIOS.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TRIMESTER_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`min-h-[36px] shrink-0 rounded-tile px-3 text-[13px] font-extrabold transition ${
                  filter === option.value
                    ? "bg-pastel-lavanda text-ink"
                    : "bg-pastel-arena/50 text-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <ul className="space-y-2">
            {exercises.map((exercise) => (
              <li key={exercise.id}>
                <Link
                  href={`/herramientas/ejercicios/${exercise.id}`}
                  className="flex items-center justify-between rounded-card border border-line bg-white p-4 transition active:scale-[0.99]"
                >
                  <span>
                    <span className="block text-sm font-extrabold text-ink">
                      {exercise.title}
                    </span>
                    <span className="block text-xs text-muted">
                      {exercise.durationMin} min · {exercise.equipment}
                    </span>
                  </span>
                  <span className="text-petrol" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {exercises.length === 0 && (
            <p className="text-sm text-muted">
              No hay ejercicios para ese trimestre todavía.
            </p>
          )}

          <MedicalReviewByline />
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-card border border-line bg-white p-5">
      <h2 className="text-base font-extrabold text-ink">
        Muy pronto vamos a sumar ejercicios ilustrados
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Estamos preparando las fotos paso a paso de cada ejercicio, para que
        se entiendan sin necesidad de un video. Cuando estén listas aparecen
        acá.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Mientras tanto, podés hacer los ejercicios de piso pélvico con el
        cronómetro guiado.
      </p>
      <Link
        href="/herramientas/kegel"
        className="mt-3 inline-block text-sm font-extrabold text-terracotta"
      >
        Ir a Kegel →
      </Link>
    </section>
  );
}
