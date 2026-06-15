import Link from "next/link";
import type { Metadata } from "next";
import { WEEKS, getWeek } from "@/lib/weeks";
import { clampWeek, MIN_WEEK, MAX_WEEK } from "@/lib/pregnancy";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";

// Statically generate all 42 weeks so they precache for offline (spec §9).
export function generateStaticParams() {
  return WEEKS.map((w) => ({ n: String(w.week) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const week = clampWeek(Number(n));
  const info = getWeek(week);
  return {
    title: `Semana ${week}`,
    description: `Semana ${week}: tu bebé es del tamaño de ${info.sizeComparison}. ${info.milestone}`,
  };
}

export default async function SemanaPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n } = await params;
  // Clamp out-of-range to nearest valid (spec §4).
  const week = clampWeek(Number(n));
  const info = getWeek(week);

  const prev = week > MIN_WEEK ? week - 1 : null;
  const next = week < MAX_WEEK ? week + 1 : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <Link href="/progreso" className="text-petrol">
          ← Progreso
        </Link>
        <span className="text-muted">{info.trimester}.º trimestre</span>
      </div>

      <header className="rounded-card bg-petrol p-5 text-white shadow-soft">
        <p className="text-sm text-white/70">Semana</p>
        <p className="text-4xl font-medium">{week}</p>
        <p className="mt-0.5 text-xs text-white/70">
          {week - 1} {week - 1 === 1 ? "semana completa" : "semanas completas"} (en
          el carné perinatal)
        </p>
        <p className="mt-3 text-base text-white/95">
          Tu bebé es del tamaño de {info.sizeComparison}.
        </p>
        {(info.lengthCm || info.weightG) && (
          <p className="mt-1 text-sm text-white/70">
            {info.lengthCm ? `≈ ${info.lengthCm} cm` : ""}
            {info.lengthCm && info.weightG ? " · " : ""}
            {info.weightG ? `≈ ${info.weightG} g` : ""}
          </p>
        )}
      </header>

      <section className="rounded-card bg-white p-5 shadow-soft">
        <h2 className="text-sm font-medium uppercase tracking-wide text-terracotta">
          Qué pasa esta semana
        </h2>
        <p className="mt-2 leading-relaxed text-ink">{info.milestone}</p>
      </section>

      <section className="rounded-card bg-sage/10 p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-petrol">
          Consejo
        </h2>
        <p className="mt-2 leading-relaxed text-ink">{info.tip}</p>
      </section>

      <nav className="flex items-center justify-between gap-3">
        {prev ? (
          <Link
            href={`/semana/${prev}`}
            className="min-h-[44px] flex-1 rounded-tile bg-white px-4 py-2.5 text-center text-sm font-medium text-petrol shadow-soft"
          >
            ← Semana {prev}
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/semana/${next}`}
            className="min-h-[44px] flex-1 rounded-tile bg-white px-4 py-2.5 text-center text-sm font-medium text-petrol shadow-soft"
          >
            Semana {next} →
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </nav>

      <MedicalReviewByline />
      <p className="text-[11px] leading-relaxed text-muted">
        Contenido informativo, no reemplaza la atención de un profesional de la
        salud. Ante cualquier duda, contactá a tu sanatorio.
      </p>
    </div>
  );
}
