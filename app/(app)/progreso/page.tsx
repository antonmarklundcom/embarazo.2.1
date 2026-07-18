"use client";

import Link from "next/link";
import { useProfile } from "@/lib/useProfile";
import { formatCompletedGestation } from "@/lib/pregnancy";
import { WEEKS } from "@/lib/weeks";
import type { Trimester } from "@/lib/types";

const TRIMESTERS: { t: Trimester; label: string; range: string }[] = [
  { t: 1, label: "Primer trimestre", range: "Semanas 1 a 13" },
  { t: 2, label: "Segundo trimestre", range: "Semanas 14 a 27" },
  { t: 3, label: "Tercer trimestre", range: "Semanas 28 a 42" },
];

export default function ProgresoPage() {
  const profile = useProfile();
  const current = profile.week ?? 0;
  const completedLabel = profile.completed
    ? formatCompletedGestation(profile.completed)
    : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Tu progreso</h1>
        {profile.hasPregnancy ? (
          <>
            <p className="text-sm text-muted">
              Estás en la <span className="font-medium text-ink">semana {current}</span>.
              Tocá cualquier semana para ver el detalle.
            </p>
            {completedLabel && (
              <p className="text-xs text-muted">{completedLabel} de gestación</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">
            Explorá las 42 semanas del embarazo.
          </p>
        )}
      </header>

      {TRIMESTERS.map(({ t, label, range }) => (
        <section key={t}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-base font-extrabold text-ink">{label}</h2>
            <span className="text-xs text-muted">{range}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {WEEKS.filter((w) => w.trimester === t).map((w) => {
              const isCurrent = w.week === current;
              const isPast = current > 0 && w.week < current;
              return (
                <Link
                  key={w.week}
                  href={`/semana/${w.week}`}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex min-h-[44px] items-center justify-center rounded-tile text-sm font-medium transition active:scale-[0.96] ${
                    isCurrent
                      ? "bg-petrol text-white shadow-soft"
                      : isPast
                        ? "bg-petrol/10 text-petrol"
                        : "bg-white text-muted shadow-soft"
                  }`}
                >
                  {w.week}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
