// W4: moved verbatim out of `app/(app)/page.tsx`, together with the ring
// constants, the stat tile and the nickname/role label helper it is the only
// caller of.

import Link from "next/link";

import { primaryBabyName } from "@/lib/babies";
import { babyAtWeekLabel as roleBabyAtWeekLabel } from "@/lib/roleCopy";
import type { BabyIdentity, Role } from "@/lib/db";

import { HeroSubject } from "@/components/hero/HeroSubject";
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
const RING_SIZE = 168;
const RING_STROKE = 8;
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
  babies: BabyIdentity[];
  role: Role;
}) {
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="rounded-card bg-white p-5 text-center shadow-soft">
      <Link
        href={`/semana/${week}`}
        aria-label={`Semana ${week}, detalles`}
        className="relative mx-auto block transition active:scale-[0.97]"
        style={{ width: RING_SIZE, height: RING_SIZE }}
      >
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="#EFE7DA"
            strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="#C96342"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        {/* U7: the inside of the ring is the themed hero now. The ring, the
            stats and the link are untouched — this is the one place the theme
            reaches the home screen. */}
        <div
          className="absolute overflow-hidden rounded-full"
          style={{ inset: RING_STROKE + 6 }}
        >
          <HeroSubject week={week} alt={babyAtWeekLabel(babies, role, week)} />
        </div>
      </Link>

      {/* B3: `week+day` is the default display, in carné notation ("24+3").
          It is labelled "SEMANAS", not "SEMANA N", on purpose — the app has
          two week numberings and this used to conflate them. `weekPlusDay`
          counts COMPLETED weeks (carné convention); `week` is the friendly
          1-based number the 42 `/semana/[n]` pages use, and it is one higher.
          Rendering "SEMANA 24+3" next to a link to /semana/25 showed the user
          two different weeks for the same day. See DECISIONS.md "B3". */}
      <p className="mt-3 text-[11px] font-extrabold tracking-[1.6px] text-petrol">
        {weekPlusDay} SEMANAS · {trimester}.º TRIMESTRE
      </p>
      <p className="mt-1 text-xl font-black text-ink">
        {completedLabel ?? `Semana ${week}`}
      </p>
      <p className="mt-0.5 text-xs font-bold text-muted">
        Del tamaño de {sizeComparison}
      </p>
      {/* U7: the way into the theme sheet, on the card it changes. */}
      <div className="mt-2">
        <ThemeChip />
      </div>

      {/* Three-stat row (feature map #10): semana · días transcurridos · faltan. */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3.5">
        <HeroStat value={String(week)} label="Semana" />
        <HeroStat value={String(daysElapsed)} label="Días pasados" />
        <HeroStat value={String(daysLeft)} label="Faltan" />
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-black text-ink">{value}</p>
      <p className="text-[11px] font-semibold text-muted">{label}</p>
    </div>
  );
}
