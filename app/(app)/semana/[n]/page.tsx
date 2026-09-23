import Link from "next/link";
import type { Metadata } from "next";
import { WEEKS, getWeek, hasSizeComparison } from "@/lib/weeks";
import { clampWeek, MIN_WEEK, MAX_WEEK } from "@/lib/pregnancy";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import { WeekHeroImage } from "@/components/WeekHeroImage";
import { ShareCard } from "@/components/ShareCard";
import { WeekArticleFeed } from "@/components/WeekArticleFeed";
import { perspectivesFor } from "@/lib/seed/perspectives";
import { questionsForWeek } from "@/lib/controlPrep";
import { weekMessage, whatsAppShareHref } from "@/lib/weekShare";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

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
  // Weeks 1–2 have no size to compare — see `sizeLine` in lib/weeks.ts. Here
  // the sentence is mid-description, so the text goes in lowercase as stored.
  const size = hasSizeComparison(info.sizeComparison)
    ? `tu bebé es del tamaño de ${info.sizeComparison}`
    : info.sizeComparison;
  return {
    title: `Semana ${week}`,
    description: `Semana ${week}: ${size}. ${info.milestone}`,
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

  // The week, told from content that already existed but only reached Hoy:
  // the band for her / her pareja / her familia (`perspectives.json`) and
  // the questions for this stage of her controls. The page used to be the
  // milestone and the tip, and nothing else. (The weekly one-liner stays on
  // Hoy: here it restated the milestone a few lines below.)
  const band = perspectivesFor(week);
  // Stage-specific questions only (the general ones live on the prep page).
  const questions = questionsForWeek(week)
    .filter((q) => !q.id.startsWith("g-"))
    .slice(0, 2);

  return (
    <div className="space-y-5">
      <WeekNav prev={prev} next={next} trimester={info.trimester} />

      <WeekHeroImage
        week={week}
        trimester={info.trimester}
        sizeComparison={info.sizeComparison}
        lengthCm={info.lengthCm}
        weightG={info.weightG}
        alt={`Tu bebé a las ${week} semanas`}
      />

      <div className="space-y-3">
        <WeekSection label="Tu bebé" tone="bg-white border border-line">
          {info.milestone}
        </WeekSection>
        {band && (
          <WeekSection label="Vos" tone="bg-pastel-rosa">
            {band.vos}
          </WeekSection>
        )}
        <WeekSection label="Para hacer esta semana" tone="bg-pastel-salvia">
          {info.tip}
        </WeekSection>
      </div>

      {questions.length > 0 && (
        <section
          aria-labelledby="preguntar"
          className="rounded-card bg-pastel-lavanda p-5"
        >
          <h2
            id="preguntar"
            className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
          >
            Para preguntar en tu control
          </h2>
          <ul className="mt-2 space-y-1.5">
            {questions.map((q) => (
              <li key={q.id} className="text-[15px] font-semibold leading-relaxed text-ink">
                {q.text}
              </li>
            ))}
          </ul>
          <Link
            href="/herramientas/resumen"
            className="mt-3 flex min-h-[44px] items-center justify-center rounded-tile bg-white px-4 text-sm font-extrabold text-petrol"
          >
            Preparar mi control →
          </Link>
        </section>
      )}

      {band && (
        <section aria-labelledby="para-ellos" className="space-y-2.5">
          <h2
            id="para-ellos"
            className="px-1 text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
          >
            Para tu pareja y tu familia
          </h2>
          <ForThem who="Tu pareja" text={band.pareja} week={week} />
          <ForThem who="Tu familia" text={band.familia} week={week} />
        </section>
      )}

      <ShareCard week={week} label={`Compartir la semana ${week}`} />

      <WeekArticleFeed week={week} />

      <WeekNav prev={prev} next={next} trimester={info.trimester} />

      {/* One disclaimer: the byline already says "no reemplaza la consulta". */}
      <MedicalReviewByline />
    </div>
  );
}

function WeekNav({
  prev,
  next,
  trimester,
}: {
  prev: number | null;
  next: number | null;
  trimester: number;
}) {
  const chip =
    "flex min-h-[44px] items-center rounded-full border border-line bg-white px-4 text-sm font-extrabold text-ink";
  return (
    <nav aria-label="Otras semanas" className="flex items-center justify-between gap-2">
      {prev ? (
        <Link href={`/semana/${prev}`} className={chip}>
          ← {prev}
        </Link>
      ) : (
        <span className="w-16" />
      )}
      <Link href="/progreso" className="text-sm font-bold text-muted underline-offset-4 hover:underline">
        {trimester}.º trimestre · ver todas
      </Link>
      {next ? (
        <Link href={`/semana/${next}`} className={chip}>
          {next} →
        </Link>
      ) : (
        <span className="w-16" />
      )}
    </nav>
  );
}

function WeekSection({
  label,
  tone,
  children,
}: {
  label: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-card p-5 ${tone}`}>
      <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-terracotta">
        {label}
      </h2>
      <p className="mt-2 text-[15px] font-semibold leading-relaxed text-ink">{children}</p>
    </section>
  );
}

/**
 * One perspective, with a WhatsApp link that sends it to them. The partner
 * text was already written for him; this is the way it reaches him without
 * him installing anything.
 */
function ForThem({ who, text, week }: { who: string; text: string; week: number }) {
  return (
    <details className="group rounded-card border border-line bg-white">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-5 text-[15px] font-extrabold text-ink">
        {who}
        <span aria-hidden className="text-muted transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="px-5 pb-5">
        <p className="text-[15px] leading-relaxed text-ink">{text}</p>
        <a
          href={whatsAppShareHref(weekMessage(week, text, APP_URL))}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex min-h-[44px] items-center justify-center rounded-tile bg-whatsapp px-4 text-sm font-extrabold text-white"
        >
          Mandáselo por WhatsApp
        </a>
      </div>
    </details>
  );
}
