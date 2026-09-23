"use client";

import { useImageFailed } from "@/lib/hooks/useImageFailed";

import { ThemeBackdrop } from "./hero/ThemeBackdrop";
import { ThemeChip } from "./hero/ThemeChip";
import { ComparisonFigure } from "./hero/ComparisonFigure";
import { useHeroTheme, useShowComparison } from "@/lib/hero/preferences";
import { bareInk, captionScrim, fallbackInk, heroTheme, themeInk } from "@/lib/hero/themes";
import { measurementNote, switchesMeasurementAt } from "@/lib/hero/scale";

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
// **The renders are not in the repo.** `public/assets/semanas/` is empty (see
// its README); this composites a 404 into the same week-number fallback G3
// shipped, on the theme rather than on flat sand. That is production today,
// and the exit criterion is that it looks finished that way.
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
  const { ref, failed: imgError, onError } = useImageFailed();
  const themeId = useHeroTheme();
  const theme = heroTheme(themeId);
  const showComparison = useShowComparison();

  // Weeks 1–2 have no embryo, so there is no subject to composite — the theme
  // and the text are the whole card, which is the honest version of "todavía
  // no hay embrión".
  const hasSubject = week >= 3;
  // Only a render needs a scrim under the caption. On the bare pastel theme
  // (no render yet, or weeks 1–2) the caption takes the theme's own dark ink
  // instead, rather than painting a brown band over a pale card.
  const onRender = hasSubject && !imgError;
  const ink = onRender ? themeInk(theme) : bareInk(theme);

  const measures = [
    lengthCm ? `≈ ${lengthCm} cm` : null,
    weightG ? `≈ ${weightG} g` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative overflow-hidden rounded-card shadow-soft">
      <ThemeBackdrop theme={themeId} />

      <div className="relative flex h-[280px] items-center justify-center">
        {hasSubject && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={ref}
            src={`/assets/semanas/bebe-${week}.webp`}
            alt={alt ?? `Tu bebé a las ${week} semanas`}
            // `object-contain`, not `cover`: the render has alpha and a theme
            // behind it now, so cropping it to fill would cut the subject the
            // background exists to frame.
            className="block h-full w-full object-contain"
            onError={onError}
          />
        ) : (
          <span
            className="text-[120px] font-black leading-none"
            style={{ color: fallbackInk(theme), opacity: 0.14 }}
          >
            {week}
          </span>
        )}
      </div>

      <div className="absolute right-4 top-4">
        <ThemeChip ink={theme.ink} />
      </div>

      {/* The scrim travels with the caption rather than sitting at a fixed
          40% of the card: with the size comparison shown, the caption is
          taller than the old scrim and its top lines (the eyebrow, "Del
          tamaño de…") landed on bare pastel as white-on-cream. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-5 pt-12"
        style={onRender ? { background: captionScrim(theme) } : undefined}
      >
        <p
          className="text-[11px] font-extrabold tracking-[1.6px]"
          style={{ color: ink.eyebrow }}
        >
          SEMANA {week} · {trimester}.º TRIMESTRE
        </p>
        <p className="mt-1 text-3xl font-black" style={{ color: ink.strong }}>
          Semana {week}
        </p>
        <p className="mt-1 text-sm font-bold" style={{ color: ink.soft }}>
          Del tamaño de {sizeComparison}
        </p>
        {measures && (
          <p className="mt-0.5 text-xs font-bold" style={{ color: ink.soft }}>
            {measures}
            {lengthCm && (
              <span className="font-semibold opacity-80">
                {" "}
                · {measurementNote(week)}
              </span>
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

        {showComparison && (
          <div className="mt-3">
            <ComparisonFigure
              week={week}
              lengthCm={lengthCm}
              ink={onRender ? "light" : theme.ink}
            />
          </div>
        )}
      </div>
    </div>
  );
}
