"use client";

import Link from "next/link";
import { useState } from "react";
import { MAX_WEEK } from "@/lib/pregnancy";

// BUILD-PLAN C1 (FEATURE-MAP #9, #10). Circular week hero with a progress ring,
// plus the three numbers people actually want.
//
// "Faltan N días" is the one that matters most and the one the old flat hero
// did not show at all.

const SIZE = 188;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function WeekProgress({
  week,
  daysSince,
  daysRemaining,
  baby,
}: {
  week: number;
  daysSince: number;
  daysRemaining: number;
  baby: string;
}) {
  const [imgError, setImgError] = useState(false);

  // Progress by day rather than by week, so the ring moves every morning
  // instead of jumping once a week.
  const totalDays = daysSince + daysRemaining;
  const fraction = totalDays > 0 ? Math.min(1, daysSince / totalDays) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);
  const percent = Math.round(fraction * 100);

  return (
    <section className="flex flex-col items-center">
      <Link
        href={`/semana/${week}`}
        aria-label={`Ver la semana ${week}`}
        className="relative block transition active:scale-[0.98]"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg
          width={SIZE}
          height={SIZE}
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#EDE5DA"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#C96342"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>

        <div
          className="absolute overflow-hidden rounded-full bg-pastel-arena"
          style={{ inset: STROKE + 5 }}
        >
          {imgError ? (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[62px] font-black leading-none text-white">
                {week}
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/assets/semanas/bebe-${week}.webp`}
              alt={`${baby === "tu bebé" ? "Tu bebé" : baby} a las ${week} semanas`}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          )}
        </div>

        <span className="sr-only">{percent}% del embarazo transcurrido</span>
      </Link>

      <dl className="mt-4 flex w-full items-stretch justify-center gap-1 text-center">
        <Stat label="Semana" value={String(week)} />
        <Divider />
        <Stat label="Días pasados" value={String(daysSince)} />
        <Divider />
        <Stat
          label={daysRemaining === 0 ? "Ya es la fecha" : "Faltan"}
          value={daysRemaining === 0 ? "🎉" : String(daysRemaining)}
        />
      </dl>

      {week >= MAX_WEEK && (
        <p className="mt-2 px-4 text-center text-xs text-muted">
          Pasaste las {MAX_WEEK} semanas. Si todavía no tuviste a tu bebé,
          hablá con tu médico/a.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1">
      <dd className="text-[26px] font-black leading-none text-ink">{value}</dd>
      <dt className="mt-1 text-[11px] font-extrabold uppercase tracking-[1.2px] text-muted">
        {label}
      </dt>
    </div>
  );
}

function Divider() {
  return <div className="w-px shrink-0 self-stretch bg-line" aria-hidden="true" />;
}
