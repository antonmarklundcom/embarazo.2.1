"use client";

import { useImageLoaded } from "@/lib/hooks/useImageFailed";
import { RealisticPicture } from "@/components/RealisticPicture";

import { ThemeBackdrop } from "./hero/ThemeBackdrop";
import { ThemeChip } from "./hero/ThemeChip";
import { ComparisonFigure } from "./hero/ComparisonFigure";
import { WeekBabyFigure } from "./hero/WeekBabyFigure";
import { useHeroTheme, useShowComparison } from "@/lib/hero/preferences";
import { bareInk, captionScrim, heroTheme, themeInk } from "@/lib/hero/themes";
import { measurementNote, switchesMeasurementAt } from "@/lib/hero/scale";
import { formatLength, formatWeight, sizeLine } from "@/lib/weeks";
import { comparisonCaption, comparisonFor } from "@/lib/seed/comparisons";
import { ComparisonChoice } from "./hero/ComparisonChoice";
import { WEEK_ART_STYLE, hasWeekArt, weekArtAlt, weekArtSrc } from "@/lib/hero/weekArt";

// Weekly baby art with the existing theme, comparison and measurement controls.
// The legacy WEEK_ART_STYLE="cutout" value preserves the established layout;
// current weekly images have cream studio backgrounds and use responsive local
// AVIF/WebP mapping. They do not require alpha. WeekBabyFigure presents the art
// as a rounded tile, while the home ring clips the same image to a circle.
// Themes continue to supply the card background and caption colors. The older
// framed-art branch and all loading fallbacks remain available for compatibility.
export function WeekHeroImage({
  week,
  trimester,
  sizeComparison,
  lengthCm,
  weightG,
  alt,
}: {
  week: number;
  trimester: number;
  sizeComparison: string;
  lengthCm?: number;
  weightG?: number;
  /** B1/B2 `babyAtWeekLabel`. Falls back to the generic sentence. */
  alt?: string;
}) {
  const { ref, loaded, onLoad } = useImageLoaded();
  const themeId = useHeroTheme();
  const theme = heroTheme(themeId);
  const showComparison = useShowComparison();

  // Weeks 1–2 have no embryo, so there is no subject to composite — the theme
  // and the text are the whole card, which is the honest version of "todavía
  // no hay embrión".
  const hasSubject = week >= 3;
  const hasArt = hasWeekArt(week);
  const framed = WEEK_ART_STYLE === "framed";
  // Preserve the load-gated legacy full-bleed branch, currently disabled. The
  // active layout keeps the caption on its selected theme and displays weekly
  // art beside the optional comparison without changing measurement semantics.
  const COMPOSITE_RENDER = false;
  const onRender = COMPOSITE_RENDER && !framed && hasArt && loaded;
  // The framed set: the picture takes the drawing's place in the bare layout.
  // It IS the size comparison (a fruit), so the "hide the comparison" toggle
  // hides it too — except on weeks 1–2, where it is a calendar, not a size.
  const framedShown = framed && hasArt && loaded && (showComparison || !hasSubject);
  const ink = onRender ? themeInk(theme) : bareInk(theme);

  const measures = [
    lengthCm ? `≈ ${formatLength(lengthCm)}` : null,
    weightG ? `≈ ${formatWeight(weightG)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const caption = (
    <>
      <p className="text-[11px] font-extrabold tracking-[1.6px]" style={{ color: ink.eyebrow }}>
        SEMANA {week} · {trimester}.º TRIMESTRE
      </p>
      <p className="mt-1 text-3xl font-black" style={{ color: ink.strong }}>
        Semana {week}
      </p>
      <p className="mt-1 text-sm font-bold" style={{ color: ink.soft }}>
        {showComparison ? (comparisonCaption(week) ?? sizeLine(sizeComparison)) : (week <= 3 ? sizeLine(sizeComparison) : "Medidas aproximadas de tu bebé")}
      </p>
      {measures && (
        <p className="mt-2 text-lg font-black" style={{ color: ink.soft }}>
          {measures}
          {lengthCm && (
            <span className="mt-1 block text-xs font-semibold opacity-80">Longitud {measurementNote(week)}</span>
          )}
        </p>
      )}
      <div className="mt-3"><ComparisonChoice ink={onRender ? "light" : theme.ink} /></div>
      {switchesMeasurementAt(week) && (
        // The crown-rump → crown-heel switch. The number jumps because the
        // ruler changed, not because the baby doubled in a week, and
        // smoothing it would make every later figure wrong to hide one
        // honest step.
        <p className="mt-1 text-[11px] font-semibold" style={{ color: ink.soft }}>
          Desde esta semana se mide de la cabeza a los pies, por eso el salto.
        </p>
      )}
    </>
  );

  const shown = onRender || framedShown;
  // The probe: always in the DOM for weeks with art, so the day a file lands
  // it is picked up with no code change. Hidden until it has loaded.
  const probe = hasArt ? (
    <RealisticPicture
      imageRef={ref}
      canonicalSrc={weekArtSrc(week)}
      sizes={framed ? "200px" : "(min-width: 768px) 704px, calc(100vw - 40px)"}
      alt={shown ? (weekArtAlt(week) ?? alt ?? `Tu bebé a las ${week} semanas`) : ""}
      aria-hidden={shown ? undefined : true}
      width={framed ? 200 : undefined}
      height={framed ? 200 : undefined}
      // Preserve legacy composite sizing and framed crops. Current studio art
      // uses the rounded WeekBabyFigure tile while this loading probe is hidden.
      className={
        framedShown
          ? "block h-[200px] w-[200px] rounded-2xl object-cover shadow-soft"
          : onRender
            ? "block h-full w-full object-contain"
            : "hidden"
      }
      onLoad={onLoad}
    />
  ) : null;

  if (!onRender) {
    return (
      <div className="relative overflow-hidden rounded-card shadow-soft">
        <ThemeBackdrop theme={themeId} />
        {!framedShown && probe}
        <div className="relative px-5 pb-5 pt-6">
          {caption}
          {framedShown ? (
            <figure className="m-0 mt-4 flex justify-center">{probe}</figure>
          ) : hasSubject && (
            <div className="mt-4 flex justify-center">
              {showComparison && comparisonFor(week) ? (
                <ComparisonFigure
                  week={week}
                  lengthCm={lengthCm}
                  ink={theme.ink}
                  boxPx={150}
                  illustrated
                />
              ) : (
                <WeekBabyFigure week={week} size={150} />
              )}
            </div>
          )}
        </div>
        {/* After the content in source order, so it paints on top without a
            z-index: a z-index here makes a stacking context, and the theme
            sheet this chip opens (position: fixed) would be trapped under
            the bottom nav with it. */}
        <div className="absolute right-4 top-4">
          <ThemeChip ink={theme.ink} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-card shadow-soft">
      <ThemeBackdrop theme={themeId} />

      <div className="relative flex h-[280px] items-center justify-center">{probe}</div>

      <div className="absolute right-4 top-4">
        <ThemeChip ink={theme.ink} />
      </div>

      {/* The scrim travels with the caption rather than sitting at a fixed
          40% of the card: with the size comparison shown, the caption is
          taller than a fixed scrim and its top lines would land on bare
          pastel as white-on-cream. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-5 pt-12"
        style={{ background: captionScrim(theme) }}
      >
        {caption}
        {showComparison && (
          <div className="mt-3">
            <ComparisonFigure week={week} lengthCm={lengthCm} ink="light" />
          </div>
        )}
      </div>
    </div>
  );
}
