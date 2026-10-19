"use client";

// Hoy's hero, 17 October 2026 redesign. The chosen theme now fills the whole
// top of the screen (behind a transparent header on phones), the week render
// floats on it instead of being cut into a circle, and the headline leads.
// Everything the old card carried is still here: the week+day, the fruit or
// the measures, the Frutas/Medidas choice, the background chip, the progress
// ring and the three numbers (fecha probable · días pasados · faltan).

import Link from "next/link";
import type { ReactNode } from "react";

import { primaryBabyName } from "@/lib/babies";
import { babyAtWeekLabel as roleBabyAtWeekLabel } from "@/lib/roleCopy";
import type { BabyIdentity, Role } from "@/lib/db";
import { sizeLine, getWeek, formatLength, formatWeight } from "@/lib/weeks";
import { measurementNote } from "@/lib/hero/scale";
import { useHeroTheme, useShowComparison } from "@/lib/hero/preferences";
import { heroTheme } from "@/lib/hero/themes";
import { hasWeekArt, weekArtAlt, weekArtSrc } from "@/lib/hero/weekArt";
import { ComparisonChoice } from "@/components/hero/ComparisonChoice";
import { comparisonFor, comparisonCaption } from "@/lib/seed/comparisons";
import { useImageFailed } from "@/lib/hooks/useImageFailed";

import { RealisticPicture } from "@/components/RealisticPicture";
import { ThemeBackdrop } from "@/components/hero/ThemeBackdrop";
import { ThemeChip } from "@/components/hero/ThemeChip";
import { WeekStrip } from "./WeekStrip";

// B1 (role-aware "Tu bebé"/"El bebé") and B2 (nickname, e.g. "Silvia") each
// shipped a `babyAtWeekLabel`. A nickname always wins when one is set, and the
// role-aware phrasing is the fallback otherwise.
function babyAtWeekLabel(babies: BabyIdentity[], role: Role, week: number): string {
  const name = primaryBabyName(babies);
  return name ? `${name} a las ${week} semanas` : roleBabyAtWeekLabel(role, week);
}

// The progress ring: 0 at the LMP, full at the due date, clamped so an overdue
// pregnancy doesn't overshoot. Thin, so it frames the baby without boxing it.
const STAGE = 252;
const RING_STROKE = 3;
const RING_RADIUS = (STAGE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Large bold text on the five light themes; 4.8:1 or better on every one of
// their gradient stops (checked against the darkest stop of each).
const HEADLINE_ON_LIGHT = "#8E3B24";

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
  weeklyOverview,
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
  weeklyOverview?: ReactNode;
}) {
  const showFruit = useShowComparison();
  const themeId = useHeroTheme();
  const theme = heroTheme(themeId);
  const dark = theme.ink === "light";
  const info = getWeek(week);
  const measures = [info.lengthCm ? "≈ " + formatLength(info.lengthCm) : null, info.weightG ? "≈ " + formatWeight(info.weightG) : null].filter(Boolean).join(" · ");
  const dashOffset = RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)));
  const caption = showFruit
    ? (comparisonCaption(week) ?? sizeLine(sizeComparison))
    : (week <= 3 ? sizeLine(sizeComparison) : "Medidas aproximadas de tu bebé");
  const notes = [
    info.lengthCm ? `Longitud ${measurementNote(week)}` : null,
    showFruit && comparisonFor(week) ? "Referencia ilustrativa, sin escala. Las frutas varían." : null,
  ].filter(Boolean);

  return (
    <section
      aria-label="El desarrollo de tu bebé"
      data-hero-theme={themeId}
      className={`hero-bleed relative isolate overflow-hidden ${dark ? "text-white" : "text-ink"}`}
    >
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: theme.background }} />
      {/* Fade into the page so the cards below start on calm ground (phones). */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-b from-transparent to-cream md:hidden" />

      <WeekStrip tone={dark ? "dark" : "light"} />

      <Link
        href={`/semana/${week}`}
        aria-label={`Semana ${week}, detalles`}
        className="relative mx-auto mt-3 block rounded-full transition active:scale-[0.98]"
        style={{ width: STAGE, height: STAGE }}
      >
        {/* The theme's motif sits behind the baby only, not across the screen. */}
        <span aria-hidden className="absolute -inset-10 overflow-hidden rounded-full opacity-80">
          <ThemeBackdrop theme={themeId} motifOnly />
        </span>
        <span
          aria-hidden
          className="absolute inset-3 rounded-full"
          style={{
            background: dark
              ? "radial-gradient(closest-side, rgba(255,248,240,0.95), rgba(255,248,240,0.55) 70%, rgba(255,248,240,0) 100%)"
              : "radial-gradient(closest-side, rgba(255,250,244,0.95), rgba(255,250,244,0.6) 62%, rgba(255,250,244,0) 100%)",
          }}
        />
        <svg width={STAGE} height={STAGE} viewBox={`0 0 ${STAGE} ${STAGE}`} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={STAGE / 2} cy={STAGE / 2} r={RING_RADIUS} fill="none" stroke={dark ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.75)"} strokeWidth={RING_STROKE} />
          <circle
            cx={STAGE / 2}
            cy={STAGE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={dark ? "#F6D9A8" : "#B5553A"}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <FloatingBaby week={week} alt={babyAtWeekLabel(babies, role, week)} blend={!dark} />
        {showFruit && <SizeBadge week={week} />}
      </Link>

      <div className="mt-4 text-center">
        <p className={`text-[12px] font-extrabold uppercase tracking-[1.6px] ${dark ? "text-white/85" : "text-ink/75"}`}>
          {weekPlusDay} semanas · {trimester}.º trimestre
        </p>
        <h1
          className="mt-1.5 text-[32px] font-black leading-[1.1] tracking-tight sm:text-[36px]"
          style={{ color: dark ? "#FFFFFF" : HEADLINE_ON_LIGHT }}
        >
          {completedLabel ?? `Semana ${week}`}
        </h1>
        <p className={`mt-2 text-[15px] font-bold ${dark ? "text-white/90" : "text-ink/85"}`}>{caption}</p>
        {measures && (
          <p className={`mx-auto mt-3 inline-flex items-center rounded-full px-4 py-1.5 text-[17px] font-black ${dark ? "bg-white/15" : "bg-white/70"}`}>
            {measures}
          </p>
        )}
        {notes.length > 0 && (
          <p className={`mx-auto mt-2 max-w-xs text-[11px] leading-relaxed ${dark ? "text-white/80" : "text-ink/75"}`}>
            {notes.join(" · ")}
          </p>
        )}

        {weeklyOverview ? <div className="mt-5">{weeklyOverview}</div> : <div className="mt-4 flex justify-center">
          <Link
            href={`/semana/${week}`}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-6 text-sm font-extrabold shadow-soft transition active:scale-[0.97] ${dark ? "bg-white text-[#232C3B]" : "bg-white text-ink"}`}
          >
            Detalles de la semana
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <ComparisonChoice ink={dark ? "light" : "dark"} />
          <ThemeChip ink={dark ? "light" : "dark"} className="min-h-11" />
        </div>
      </div>

      <div className={`mt-6 grid grid-cols-3 rounded-[22px] px-2 py-3.5 text-center backdrop-blur-sm ${dark ? "bg-white/12" : "bg-white/65 shadow-soft"}`}>
        <HeroStat value={dueDateLabel} label="Fecha probable" dark={dark} />
        <HeroStat value={String(daysElapsed)} label="Días pasados" dark={dark} divider />
        <HeroStat value={String(daysLeft)} label="Faltan" dark={dark} divider />
      </div>
    </section>
  );
}

/**
 * The week render, floating. The studio art is cream-backed; multiply melts
 * that cream into a light theme, and a radial mask feathers the square away
 * on every theme (including the dark one, where multiply would darken the baby).
 */
function FloatingBaby({ week, alt, blend }: { week: number; alt: string; blend: boolean }) {
  const { ref, failed, onError } = useImageFailed();
  const mask = "radial-gradient(closest-side, #000 74%, transparent 100%)";
  if (!hasWeekArt(week) || failed) {
    return (
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="text-6xl font-black leading-none text-ink/45">{week}</span>
      </span>
    );
  }
  return (
    <RealisticPicture
      imageRef={ref}
      canonicalSrc={weekArtSrc(week)}
      sizes={`${STAGE}px`}
      alt={weekArtAlt(week) ?? alt}
      fetchPriority="high"
      className="absolute inset-2 block h-[calc(100%-1rem)] w-[calc(100%-1rem)] object-cover"
      style={{
        objectPosition: "center 40%",
        mixBlendMode: blend ? "multiply" : "normal",
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
      onError={onError}
    />
  );
}

function SizeBadge({ week }: { week: number }) {
  const comparison = comparisonFor(week);
  const { ref, failed, onError } = useImageFailed();
  if (!comparison?.imageSrc || failed) return null;
  return (
    <span
      className="absolute bottom-3 right-1 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-soft"
      aria-hidden
    >
      <RealisticPicture
        imageRef={ref}
        canonicalSrc={comparison.imageSrc}
        sizes="64px"
        alt=""
        width={64}
        height={64}
        className="block h-16 w-16 object-cover"
        onError={onError}
      />
    </span>
  );
}

function HeroStat({ value, label, dark, divider = false }: { value: string; label: string; dark: boolean; divider?: boolean }) {
  return (
    <div className={divider ? (dark ? "border-l border-white/20" : "border-l border-ink/10") : undefined}>
      <p className="text-lg font-black">{value}</p>
      <p className={`text-xs font-semibold ${dark ? "text-white/85" : "text-ink/80"}`}>{label}</p>
    </div>
  );
}
