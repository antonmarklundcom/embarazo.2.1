"use client";

// The /semana/[n] hero, 17 October 2026 redesign — the same full-bleed frame
// Hoy got (`components/home/WeekHero.tsx`, `.hero-bleed` in app/globals.css).
// The chosen theme fills the top of the screen behind the transparent header
// on phones, the week render floats on it (multiply + radial mask) instead of
// sitting in a tile, and the week leads in big type. Everything the old card
// carried is still here, with the same words: the eyebrow, "Semana N", the
// fruit or the measures, the measurement notes, the crown-heel switch note,
// Frutas/Medidas and the Fondo chip.
//
// Contracts kept on purpose (e2e/week-hero.spec.ts, e2e/offline.spec.ts):
// - the baby and the fruit share the page's only <figure>, and only while the
//   comparison is shown; with Medidas there is no figure at all;
// - weeks 1–2 have no embryo, so no baby art and no figure — the theme and the
//   text are the whole hero, the honest version of "todavía no hay embrión";
// - a failed week render falls back to the drawn baby (BabyIllustration).

import type { ReactNode } from "react";

import { useImageFailed } from "@/lib/hooks/useImageFailed";
import { RealisticPicture } from "@/components/RealisticPicture";
import { ThemeBackdrop } from "./hero/ThemeBackdrop";
import { ThemeChip } from "./hero/ThemeChip";
import { BabyIllustration } from "./hero/BabyIllustration";
import { ComparisonChoice } from "./hero/ComparisonChoice";
import { useHeroTheme, useShowComparison } from "@/lib/hero/preferences";
import { heroTheme } from "@/lib/hero/themes";
import { measurementNote, switchesMeasurementAt } from "@/lib/hero/scale";
import { formatLength, formatWeight, sizeLine } from "@/lib/weeks";
import { ILLUSTRATION_CAPTION, comparisonCaption, comparisonFor } from "@/lib/seed/comparisons";
import { hasWeekArt, weekArtAlt, weekArtSrc } from "@/lib/hero/weekArt";

// The floating stage, a little smaller than Hoy's ring so the headline still
// shows above the fold on a 320px phone with the week nav on top.
const STAGE = 232;

// Same value as Hoy's headline (components/home/WeekHero.tsx): large bold text
// on the five light themes, 4.8:1 or better on the darkest stop of each.
const HEADLINE_ON_LIGHT = "#8E3B24";

export function WeekHeroImage({
  week,
  trimester,
  sizeComparison,
  lengthCm,
  weightG,
  alt,
  nav,
}: {
  week: number;
  trimester: number;
  sizeComparison: string;
  lengthCm?: number;
  weightG?: number;
  /** B1/B2 `babyAtWeekLabel`. Falls back to the generic sentence. */
  alt?: string;
  /** The prev/next week nav, drawn on the theme at the top of the hero. */
  nav?: ReactNode;
}) {
  const themeId = useHeroTheme();
  const theme = heroTheme(themeId);
  const dark = theme.ink === "light";
  const showComparison = useShowComparison();

  const hasSubject = week >= 3;
  const comparison = comparisonFor(week);
  // The same condition ComparisonFigure used: a fruit needs a length to stand for.
  const withFruit =
    hasSubject && showComparison && !!comparison && !!lengthCm && Number.isFinite(lengthCm);

  const measures = [
    lengthCm ? `≈ ${formatLength(lengthCm)}` : null,
    weightG ? `≈ ${formatWeight(weightG)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const caption = showComparison
    ? (comparisonCaption(week) ?? sizeLine(sizeComparison))
    : week <= 3
      ? sizeLine(sizeComparison)
      : "Medidas aproximadas de tu bebé";

  const soft = dark ? "text-white/90" : "text-ink/85";
  const quiet = dark ? "text-white/80" : "text-ink/75";
  const babyAlt = weekArtAlt(week) ?? alt ?? `Tu bebé a las ${week} semanas`;

  const stage = hasSubject ? (
    <span className="relative mx-auto block" style={{ width: STAGE, height: STAGE }}>
      {/* The theme's motif sits behind the baby only, not across the screen. */}
      <span aria-hidden className="absolute -inset-8 overflow-hidden rounded-full opacity-80">
        <ThemeBackdrop theme={themeId} motifOnly />
      </span>
      <span aria-hidden className="absolute inset-2 rounded-full" style={{ background: glow(dark) }} />
      <FloatingBaby week={week} alt={babyAlt} blend={!dark} />
      {withFruit && comparison?.imageSrc && <FruitBadge src={comparison.imageSrc} />}
    </span>
  ) : (
    // Weeks 1–2: the motif and the light only. No baby art, no figure.
    <span aria-hidden className="relative mx-auto block h-28 w-28">
      <span className="absolute -inset-6 overflow-hidden rounded-full opacity-80">
        <ThemeBackdrop theme={themeId} motifOnly />
      </span>
      <span className="absolute inset-0 rounded-full" style={{ background: glow(dark) }} />
    </span>
  );

  return (
    <section
      aria-label={`Tu bebé en la semana ${week}`}
      data-hero-theme={themeId}
      className={`hero-bleed relative isolate overflow-hidden ${dark ? "text-white" : "text-ink"}`}
    >
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: theme.background }} />
      {/* Fade into the page so the cards below start on calm ground (phones). */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-b from-transparent to-cream md:hidden" />

      {nav}

      <div className="mt-4">
        {/* From week 3 the baby is always the page's figure (offline.spec and
            the share/size specs find it there); the "sin escala" caption only
            belongs next to the fruit. */}
        {hasSubject ? (
          <figure className="m-0">
            {stage}
            {withFruit && (
              <figcaption className={`mx-auto mt-3 max-w-xs text-center text-[11px] font-semibold leading-relaxed ${quiet}`}>
                {ILLUSTRATION_CAPTION}
              </figcaption>
            )}
          </figure>
        ) : (
          stage
        )}
      </div>

      <div className="mt-4 text-center">
        <p className={`text-[12px] font-extrabold uppercase tracking-[1.6px] ${quiet}`}>
          SEMANA {week} · {trimester}.º TRIMESTRE
        </p>
        <p
          className="mt-1.5 text-[34px] font-black leading-[1.1] tracking-tight sm:text-[38px]"
          style={{ color: dark ? "#FFFFFF" : HEADLINE_ON_LIGHT }}
        >
          Semana {week}
        </p>
        <p className={`mt-2 text-[15px] font-bold ${soft}`}>{caption}</p>

        {measures && (
          <p
            className={`mx-auto mt-3 inline-flex items-center rounded-full px-4 py-1.5 text-[17px] font-black backdrop-blur-sm ${
              dark ? "bg-white/15" : "bg-white/70 shadow-soft"
            }`}
          >
            {measures}
          </p>
        )}
        {lengthCm && (
          <p className={`mx-auto mt-2 max-w-xs text-[11px] font-semibold leading-relaxed ${quiet}`}>
            Longitud {measurementNote(week)}
          </p>
        )}
        {switchesMeasurementAt(week) && (
          // The crown-rump → crown-heel switch. The number jumps because the
          // ruler changed, not because the baby doubled in a week, and
          // smoothing it would make every later figure wrong to hide one
          // honest step.
          <p className={`mx-auto mt-1 max-w-xs text-[11px] font-semibold leading-relaxed ${quiet}`}>
            Desde esta semana se mide de la cabeza a los pies, por eso el salto.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <ComparisonChoice ink={dark ? "light" : "dark"} />
          <ThemeChip ink={dark ? "light" : "dark"} className="min-h-11" />
        </div>
      </div>
    </section>
  );
}

function glow(dark: boolean): string {
  return dark
    ? "radial-gradient(closest-side, rgba(255,248,240,0.95), rgba(255,248,240,0.55) 70%, rgba(255,248,240,0) 100%)"
    : "radial-gradient(closest-side, rgba(255,250,244,0.95), rgba(255,250,244,0.6) 62%, rgba(255,250,244,0) 100%)";
}

/**
 * The week render, floating, as on Hoy. The studio art is cream-backed;
 * multiply melts that cream into a light theme, and a radial mask feathers the
 * square away on every theme (including the dark one, where multiply would
 * darken the baby). A missing or failed file shows the drawn baby instead.
 */
function FloatingBaby({ week, alt, blend }: { week: number; alt: string; blend: boolean }) {
  const { ref, failed, onError } = useImageFailed();
  const mask = "radial-gradient(closest-side, #000 74%, transparent 100%)";
  if (!hasWeekArt(week) || failed) {
    return (
      <span className="absolute inset-0 flex items-center justify-center">
        <BabyIllustration week={week} size={Math.round(STAGE * 0.7)} />
      </span>
    );
  }
  return (
    <RealisticPicture
      imageRef={ref}
      canonicalSrc={weekArtSrc(week)}
      sizes={`${STAGE}px`}
      alt={alt}
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

/** This week's fruit, in a white badge on the stage. Decorative: the caption says it in words. */
function FruitBadge({ src }: { src: string }) {
  const { ref, failed, onError } = useImageFailed();
  return (
    <span
      aria-hidden
      className="absolute bottom-2 right-0 flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-soft"
    >
      {failed ? (
        <span className="text-4xl">🍃</span>
      ) : (
        <RealisticPicture
          imageRef={ref}
          canonicalSrc={src}
          sizes="72px"
          alt=""
          width={72}
          height={72}
          className="block h-[72px] w-[72px] object-contain"
          onError={onError}
        />
      )}
    </span>
  );
}
