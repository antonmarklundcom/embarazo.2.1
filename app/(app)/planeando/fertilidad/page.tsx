"use client";

import Link from "next/link";
import { useCycles } from "@/lib/useCycles";
import { estimateFertileWindow, daysUntil } from "@/lib/cycle";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import { PrivacyLine } from "@/components/PrivacyLine";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function FertilidadPage() {
  const cycles = useCycles();

  // Estimate from the most recent recorded cycle start.
  const lastStart = cycles.lastStart;
  const window =
    lastStart !== undefined
      ? estimateFertileWindow(lastStart, cycles.effectiveCycleLength)
      : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Días fértiles y ovulación
        </h1>
        <p className="text-sm text-muted">
          Una estimación de tu ventana fértil a partir de tu calendario.
        </p>
      </header>

      {/* Prominent, non-negotiable disclaimer */}
      <div className="rounded-card border border-terracotta/30 bg-terracotta/5 p-4 text-sm text-ink">
        <span className="font-medium">Es una estimación, no sirve como método
        anticonceptivo.</span>{" "}
        La ovulación puede variar de un ciclo a otro. Estos datos son
        orientativos y no reemplazan una consulta médica.
      </div>

      {!window ? (
        <section className="rounded-card bg-white p-5 text-center shadow-soft">
          <p className="text-sm text-muted">
            Todavía no registraste ninguna regla. Cargá tu última regla para
            estimar tus días fértiles.
          </p>
          <Link
            href="/planeando/calendario"
            className="mt-3 inline-block min-h-[44px] rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white"
          >
            Ir al calendario
          </Link>
        </section>
      ) : (
        <>
          <section className="rounded-card bg-petrol p-5 text-white shadow-soft">
            <p className="text-sm text-white/70">Ovulación estimada</p>
            <p className="mt-1 text-2xl font-black capitalize">
              {fmtDate(window.ovulation)}
            </p>
            {(() => {
              const d = daysUntil(window.ovulation);
              if (d > 0)
                return (
                  <p className="mt-1 text-sm text-white/80">
                    En aproximadamente {d} {d === 1 ? "día" : "días"}.
                  </p>
                );
              if (d === 0)
                return <p className="mt-1 text-sm text-white/80">Sería hoy.</p>;
              return (
                <p className="mt-1 text-sm text-white/80">
                  La estimación de este ciclo ya pasó. Registrá tu próxima regla
                  para una nueva estimación.
                </p>
              );
            })()}
          </section>

          <section className="rounded-card bg-sage/10 p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-[1.6px] text-petrol">
              Ventana fértil estimada
            </h2>
            <p className="mt-2 text-base capitalize text-ink">
              Del {fmtDate(window.start)}
            </p>
            <p className="text-base capitalize text-ink">
              al {fmtDate(window.end)}
            </p>
            <p className="mt-2 text-xs text-muted">
              Son los días con más probabilidad de embarazo: los 5 días previos a
              la ovulación y el día siguiente. Calculado con un ciclo promedio de{" "}
              {cycles.effectiveCycleLength} días.
            </p>
          </section>
        </>
      )}

      <div className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-sm font-extrabold text-ink">¿Cómo lo calculamos?</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Estimamos la ovulación unos 14 días antes de tu próxima regla esperada.
          Es un método simple y general; tu cuerpo puede ovular antes o después.
          Si querés mayor precisión, conversá con tu médico/a.
        </p>
      </div>

      <MedicalReviewByline />
      <PrivacyLine />
    </div>
  );
}
