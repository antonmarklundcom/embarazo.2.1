"use client";

import Link from "next/link";
import { useProfile } from "@/lib/useProfile";
import { useCycles } from "@/lib/useCycles";
import { cycleDay, daysUntil } from "@/lib/cycle";
import { departmentName } from "@/lib/departments";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import { PrivacyLine } from "@/components/PrivacyLine";

function fmtLong(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Home dashboard for "planeando / buscando" mode (build spec §3). Shown both
// on Inicio (when that mode is active) and at /planeando.
export function PlaneandoHome() {
  const profile = useProfile();
  const cycles = useCycles();

  const department = profile.department;
  const lastStart = cycles.lastStart;
  const predicted = cycles.predictedNextStart;
  const dayInCycle = lastStart ? cycleDay(lastStart) : null;
  const daysToNext = predicted !== undefined ? daysUntil(predicted) : null;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted">Hola 👋</p>
        <h1 className="text-xl font-medium text-petrol-dark">
          Estás planeando tu embarazo
        </h1>
        <p className="text-sm text-muted">
          Acompañamos tu camino para buscar embarazo, con calma y privacidad.
        </p>
      </header>

      {/* Cycle status hero */}
      <div className="rounded-card bg-petrol p-5 text-white shadow-soft">
        {lastStart ? (
          <>
            <p className="text-sm text-white/70">Tu ciclo</p>
            <p className="text-3xl font-medium">Día {dayInCycle}</p>
            {predicted !== undefined && (
              <p className="mt-2 text-sm text-white/90">
                Próxima regla estimada: {fmtLong(predicted)}
                {daysToNext !== null && daysToNext >= 0
                  ? ` (en ${daysToNext} ${daysToNext === 1 ? "día" : "días"})`
                  : ""}
              </p>
            )}
            <p className="mt-1 text-xs text-white/60">
              Ciclo promedio estimado: {cycles.effectiveCycleLength} días.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-white/70">Empezá tu calendario</p>
            <p className="mt-1 text-base text-white/90">
              Registrá tu última regla para estimar tu próximo período y tus días
              fértiles.
            </p>
            <Link
              href="/planeando/calendario"
              className="mt-3 inline-block text-sm font-medium text-rose"
            >
              Registrar mi regla →
            </Link>
          </>
        )}
      </div>

      {/* Tool tiles (bento) */}
      <section aria-labelledby="planeando-tools" className="space-y-3">
        <h2 id="planeando-tools" className="text-sm font-medium text-ink">
          Tus herramientas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Tile
            href="/planeando/calendario"
            title="Calendario menstrual"
            subtitle="Registrá tus reglas"
            tone="rose"
          />
          <Tile
            href="/planeando/fertilidad"
            title="Días fértiles"
            subtitle="Estimación de ovulación"
            tone="terracotta"
          />
          <Tile
            href="/planeando/checklist"
            title="Preconcepción"
            subtitle="Checklist antes de buscar"
            tone="sage"
          />
          <Tile
            href="/planeando/consultar"
            title="¿Cuándo consultar?"
            subtitle="Orientación sobre fertilidad"
            tone="petrol"
          />
        </div>
      </section>

      {/* Estimate disclaimer */}
      <div className="rounded-card border border-terracotta/20 bg-terracotta/5 p-4 text-sm text-ink">
        Las predicciones de regla y días fértiles son una{" "}
        <span className="font-medium">estimación</span> y no sirven como método
        anticonceptivo.
      </div>

      {/* Nearby resources pointer */}
      <Link
        href="/directorio"
        className="block rounded-card bg-white p-4 shadow-soft transition active:scale-[0.99]"
      >
        <h3 className="text-base font-medium text-ink">Cerca tuyo</h3>
        <p className="mt-1 text-sm text-muted">
          Obstetras, ginecología y más, por departamento.
        </p>
      </Link>

      <div className="flex items-center justify-between pt-2">
        <MedicalReviewByline />
        {department && (
          <span className="text-xs text-muted">{departmentName(department)}</span>
        )}
      </div>
      <PrivacyLine />
    </div>
  );
}

function Tile({
  href,
  title,
  subtitle,
  tone,
}: {
  href: string;
  title: string;
  subtitle: string;
  tone: "rose" | "terracotta" | "sage" | "petrol";
}) {
  const dot =
    tone === "rose"
      ? "bg-rose"
      : tone === "terracotta"
        ? "bg-terracotta"
        : tone === "sage"
          ? "bg-sage"
          : "bg-petrol";
  return (
    <Link
      href={href}
      className="flex min-h-[88px] flex-col justify-between rounded-tile bg-white p-4 shadow-soft transition active:scale-[0.98]"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      <div>
        <p className="text-base font-medium text-ink">{title}</p>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>
    </Link>
  );
}
