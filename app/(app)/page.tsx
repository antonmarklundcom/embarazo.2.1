"use client";

import Link from "next/link";
import { useState } from "react";
import { useProfile } from "@/lib/useProfile";
import { getWeek } from "@/lib/weeks";
import { departmentName } from "@/lib/departments";
import { Onboarding } from "@/components/Onboarding";
import { LocalResourcesBlock } from "@/components/LocalResourcesBlock";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import { PrivacyLine } from "@/components/PrivacyLine";

export default function InicioPage() {
  const profile = useProfile();
  // Bump to force a re-read right after onboarding saves (useLiveQuery also
  // reacts, but this avoids any flash).
  const [, setNonce] = useState(0);

  if (profile.loading) {
    return <HomeSkeleton />;
  }

  if (!profile.hasProfile) {
    return <Onboarding onDone={() => setNonce((n) => n + 1)} />;
  }

  const week = profile.week!;
  const trimester = profile.trimester!;
  const department = profile.department!;
  const info = getWeek(week);

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <header>
        <p className="text-sm text-muted">Hola 👋</p>
        <h1 className="text-xl font-medium text-petrol-dark">
          Semana {week} · {trimester}.º trimestre
        </h1>
        {profile.daysRemaining !== undefined && (
          <p className="text-sm text-muted">
            Faltan aproximadamente {profile.daysRemaining} días para tu fecha
            probable de parto.
          </p>
        )}
      </header>

      {/* Hero week card */}
      <Link
        href={`/semana/${week}`}
        className="block rounded-card bg-petrol p-5 text-white shadow-soft transition active:scale-[0.99]"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/70">Esta semana</p>
            <p className="text-3xl font-medium">Semana {week}</p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs">
            {trimester}.º trimestre
          </span>
        </div>
        <p className="mt-3 text-sm text-white/90">
          Tu bebé es del tamaño de {info.sizeComparison}.
        </p>
        {(info.lengthCm || info.weightG) && (
          <p className="mt-1 text-xs text-white/70">
            {info.lengthCm ? `≈ ${info.lengthCm} cm` : ""}
            {info.lengthCm && info.weightG ? " · " : ""}
            {info.weightG ? `≈ ${info.weightG} g` : ""}
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-white/90">
          {info.milestone}
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-rose">
          Ver la semana →
        </span>
      </Link>

      {/* Tool tiles (bento) */}
      <section aria-labelledby="herramientas" className="space-y-3">
        <h2 id="herramientas" className="text-sm font-medium text-ink">
          Herramientas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <ToolTile href="/herramientas/pataditas" title="Pataditas" subtitle="Contá movimientos" tone="rose" />
          <ToolTile href="/herramientas/contracciones" title="Contracciones" subtitle="Cronometrá" tone="terracotta" />
          <ToolTile href="/herramientas/peso" title="Peso" subtitle="Seguí tu evolución" tone="sage" />
          <ToolTile href="/herramientas/checklist" title="Checklists" subtitle="Bolso y trámites" tone="petrol" />
        </div>
      </section>

      {/* Local resources (placements) */}
      <LocalResourcesBlock trimester={trimester} department={department} week={week} />

      {/* Seasonal info card */}
      <Link
        href="/guias/dengue-zika-chikungunya-embarazo"
        className="block rounded-card border border-terracotta/20 bg-terracotta/5 p-4 transition active:scale-[0.99]"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-terracotta">
          De temporada
        </p>
        <h3 className="mt-1 text-base font-medium text-ink">
          Cuidate del dengue en el embarazo
        </h3>
        <p className="mt-1 text-sm text-muted">
          Con el calor y la lluvia, prevenir el mosquito es parte de tu cuidado.
        </p>
      </Link>

      <div className="flex items-center justify-between pt-2">
        <MedicalReviewByline />
        <span className="text-xs text-muted">{departmentName(department)}</span>
      </div>
      <PrivacyLine />
    </div>
  );
}

function ToolTile({
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

function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-2/3 animate-pulse rounded-tile bg-black/5" />
      <div className="h-44 animate-pulse rounded-card bg-black/5" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-tile bg-black/5" />
        ))}
      </div>
    </div>
  );
}
