import Link from "next/link";
import type { Metadata } from "next";
import { WEEKS, getWeek } from "@/lib/weeks";
import { clampWeek, MIN_WEEK, MAX_WEEK } from "@/lib/pregnancy";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import { WeekHeroImage } from "@/components/WeekHeroImage";

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
        <Link href="/progreso" className="font-extrabold text-terracotta">
          ← Progreso
        </Link>
        <span className="font-bold text-muted">{info.trimester}.º trimestre</span>
      </div>

      <WeekHeroImage
        week={week}
        trimester={info.trimester}
        sizeComparison={info.sizeComparison}
        lengthCm={info.lengthCm}
        weightG={info.weightG}
      />

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-terracotta">
          Qué pasa esta semana
        </h2>
        <p className="mt-2 text-[15px] font-semibold leading-relaxed text-ink">
          {info.milestone}
        </p>
      </section>

      <section className="rounded-card bg-pastel-salvia p-5">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Consejo
        </h2>
        <p className="mt-2 text-[15px] font-semibold leading-relaxed text-ink">
          {info.tip}
        </p>
      </section>

      <nav className="flex items-center justify-between gap-3">
        {prev ? (
          <Link
            href={`/semana/${prev}`}
            className="min-h-[44px] flex-1 rounded-tile border border-line bg-white px-4 py-2.5 text-center text-sm font-extrabold text-ink"
          >
            ← Semana {prev}
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/semana/${next}`}
            className="min-h-[44px] flex-1 rounded-tile border border-line bg-white px-4 py-2.5 text-center text-sm font-extrabold text-ink"
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
