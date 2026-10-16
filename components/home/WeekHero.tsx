// W4: moved verbatim out of `app/(app)/page.tsx`, together with the ring
// constants, the stat tile and the nickname/role label helper it is the only
// caller of.

import Link from "next/link";

import { primaryBabyName } from "@/lib/babies";
import { babyAtWeekLabel as roleBabyAtWeekLabel } from "@/lib/roleCopy";
import type { BabyIdentity, Role } from "@/lib/db";
import { sizeLine, getWeek, formatLength, formatWeight } from "@/lib/weeks";
import { measurementNote } from "@/lib/hero/scale";
import { useShowComparison } from "@/lib/hero/preferences";
import { ComparisonChoice } from "@/components/hero/ComparisonChoice";
import { comparisonFor, comparisonCaption } from "@/lib/seed/comparisons";
import { useImageFailed } from "@/lib/hooks/useImageFailed";

import { HeroSubject } from "@/components/hero/HeroSubject";
import { RealisticPicture } from "@/components/RealisticPicture";
import { ThemeChip } from "@/components/hero/ThemeChip";

// B1 (role-aware "Tu bebé"/"El bebé") and B2 (nickname, e.g. "Silvia") each
// shipped a `babyAtWeekLabel`. Combined here rather than in either library:
// a nickname always wins when one is set, and the role-aware phrasing is
// the fallback otherwise — neither library needs to know about the other.
function babyAtWeekLabel(babies: BabyIdentity[], role: Role, week: number): string {
  const name = primaryBabyName(babies);
  return name ? `${name} a las ${week} semanas` : roleBabyAtWeekLabel(role, week);
}

// C1: circular hero with a progress ring, replacing the old flat banner
// card. The ring shows gestation progress (0 at LMP, full circle at the due
// date, clamped so an overdue pregnancy doesn't overshoot). Below it, the
// three-stat row (semana · días transcurridos · faltan) feature map #10
// asks for explicitly, rather than leaving those numbers implicit in prose.
const RING_SIZE = 208;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function WeekHero({
  week,
  weekPlusDay,
  trimester,
  completedLabel,
  sizeComparison,
  progress,
  daysElapsed,
  daysLeft,
  dueDateLabel,
  babies,
  role,
}: {
  week: number;
  weekPlusDay: string;
  trimester: number;
  completedLabel: string | null;
  sizeComparison: string;
  /** 0..1 fraction of gestation completed. */
  progress: number;
  daysElapsed: number;
  daysLeft: number;
  /** "12 mar." — the FPP, short. */
  dueDateLabel: string;
  babies: BabyIdentity[];
  role: Role;
}) {
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const showFruit = useShowComparison();
  const info = getWeek(week);
  const measures = [info.lengthCm ? "≈ " + formatLength(info.lengthCm) : null, info.weightG ? "≈ " + formatWeight(info.weightG) : null].filter(Boolean).join(" · ");

  return (
    <section aria-label="El desarrollo de tu bebé" className="overflow-hidden rounded-[28px] bg-pastel-salvia/40 p-6 sm:p-8">
      <div className="grid items-center gap-7 text-center md:grid-cols-[minmax(0,1fr)_224px] md:text-left">
        <div className="md:col-start-2 md:row-start-1">
          <Link
            href={`/semana/${week}`}
            aria-label={`Semana ${week}, detalles`}
            className="relative mx-auto block rounded-full transition active:scale-[0.97]"
            style={{ width: RING_SIZE, height: RING_SIZE }}
          >
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              className="absolute inset-0 -rotate-90"
              aria-hidden
            >
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke="#FFFFFF" strokeWidth={RING_STROKE} />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="#B5553A"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="absolute overflow-hidden rounded-full" style={{ inset: RING_STROKE + 7 }}>
              <HeroSubject week={week} alt={babyAtWeekLabel(babies, role, week)} />
            </div>
            {showFruit && <SizeBadge week={week} />}
          </Link>
        </div>

        <div className="min-w-0 md:col-start-1 md:row-start-1">
          {/* Keep completed weeks + days distinct from the friendly week link. */}
          <p className="text-xs font-extrabold tracking-[1.4px] text-petrol">
            {weekPlusDay} SEMANAS · {trimester}.º TRIMESTRE
          </p>
          <h1 className="mt-3 text-[28px] font-black leading-tight tracking-tight text-ink sm:text-[32px]">
            {completedLabel ?? `Semana ${week}`}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-ink/80">
            {showFruit ? (comparisonCaption(week) ?? sizeLine(sizeComparison)) : (week <= 3 ? sizeLine(sizeComparison) : "Medidas aproximadas de tu bebé")}
          </p>
          {measures && <p className="mt-3 text-xl font-black text-ink">{measures}</p>}
          {info.lengthCm && <p className="mt-1 text-xs leading-relaxed text-ink/80">Longitud {measurementNote(week)}</p>}
          {showFruit && comparisonFor(week) && <p className="mt-2 text-xs leading-relaxed text-ink/80">Referencia ilustrativa, sin escala. Las frutas varían.</p>}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <ComparisonChoice />
            <ThemeChip className="min-h-11" />
          </div>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-2 border-t border-petrol/10 pt-5 text-center">
        <HeroStat value={dueDateLabel} label="Fecha probable" />
        <HeroStat value={String(daysElapsed)} label="Días pasados" />
        <HeroStat value={String(daysLeft)} label="Faltan" />
      </div>
    </section>
  );
}
function SizeBadge({ week }: { week: number }) {
  const comparison = comparisonFor(week);
  const { ref, failed, onError } = useImageFailed();
  if (!comparison?.imageSrc || failed) return null;
  return (
    <span
      className="absolute bottom-1 right-1 flex h-[68px] w-[68px] items-center justify-center rounded-full border-4 border-white bg-cream shadow-soft"
      aria-hidden
    >
      <RealisticPicture
        imageRef={ref}
        canonicalSrc={comparison.imageSrc}
        sizes="48px"
        alt=""
        width={48}
        height={48}
        className="block h-12 w-12 object-contain"
        onError={onError}
      />
    </span>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-black text-ink">{value}</p>
      <p className="text-xs font-semibold text-ink/80">{label}</p>
    </div>
  );
}
