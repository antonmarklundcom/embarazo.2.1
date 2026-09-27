"use client";

import { useImageLoaded } from "@/lib/hooks/useImageFailed";

import { ThemeBackdrop } from "./hero/ThemeBackdrop";
import { ThemeChip } from "./hero/ThemeChip";
import { ComparisonFigure } from "./hero/ComparisonFigure";
import { BabyIllustration } from "./hero/BabyIllustration";
import { useHeroTheme, useShowComparison } from "@/lib/hero/preferences";
import { bareInk, captionScrim, heroTheme, themeInk } from "@/lib/hero/themes";
import { measurementNote, switchesMeasurementAt } from "@/lib/hero/scale";
import { formatLength, formatWeight, sizeLine } from "@/lib/weeks";
import { WEEK_ART_STYLE, hasWeekArt, weekArtAlt, weekArtSrc } from "@/lib/hero/weekArt";

// Weekly "bebé a las N semanas" hero, v2 (U7).
//
// What changed from G3: the render is no longer the background. It is a
// subject with alpha, composited over a theme the woman chooses
// (`lib/hero/themes.ts`), which is what makes personalisation cost six
// gradients instead of 42 × 6 image files — the trade HANDOFF §2 settled when
// it rejected multiple baby art styles.
//
// The old hero hard-coded white text over a dark bottom gradient. That is an
// assumption about a photograph, and it breaks the moment the background is a
// pale lace medallion, so the scrim and the ink now come from the theme.
//
// **What is on disk today is the site's framed set, not the cutouts.**
// `public/assets/semanas/` holds the 42 size illustrations copied from
// embarazo.com.py (`scripts/import-site-week-art.mjs`): opaque squares, so
// they sit in the card as a framed picture where the drawn fallback was, and
// the theme stays around them. The composited layout below is kept for the
// transparent renders; `lib/hero/weekArt.ts` says which set is on disk.
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
  // The render layout only once a cutout render has actually loaded. Until
  // then the card is the bare layout — caption on the theme in its own dark
  // ink, and the drawn baby beside the size comparison — so it never flashes a
  // scrimmed caption over an empty frame and then swaps after hydration.
  const onRender = !framed && hasArt && loaded;
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
        {sizeLine(sizeComparison)}
      </p>
      {measures && (
        <p className="mt-0.5 text-xs font-bold" style={{ color: ink.soft }}>
          {measures}
          {lengthCm && (
            <span className="font-semibold opacity-80"> · {measurementNote(week)}</span>
          )}
        </p>
      )}
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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={weekArtSrc(week)}
      alt={shown ? (weekArtAlt(week) ?? alt ?? `Tu bebé a las ${week} semanas`) : ""}
      aria-hidden={shown ? undefined : true}
      width={framed ? 200 : undefined}
      height={framed ? 200 : undefined}
      // Cutout: `object-contain`, not `cover` — the render has alpha and a
      // theme behind it, so cropping it to fill would cut the subject the
      // background exists to frame. Framed: a square picture in a square box.
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
              {showComparison ? (
                <ComparisonFigure
                  week={week}
                  lengthCm={lengthCm}
                  ink={theme.ink}
                  boxPx={150}
                  illustrated
                />
              ) : (
                <BabyIllustration week={week} size={150} />
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
