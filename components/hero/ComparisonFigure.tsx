"use client";

import { useImageFailed } from "@/lib/hooks/useImageFailed";
import { BabyIllustration } from "./BabyIllustration";

import { comparisonFor } from "@/lib/seed/comparisons";
import { heroScale, notToScaleCaption } from "@/lib/hero/scale";

// U7 — the baby and the fruit, at proportionally correct relative scale.
//
// The thing this replaces is two same-sized icons side by side, which is what
// almost every pregnancy app draws and which makes the comparison meaningless:
// a poppy seed and a watermelon rendered identically say nothing about size.
// `heroScale` does the arithmetic; this draws the result and, when the drawing
// had to be clamped to stay visible, says so on screen.
//
// Both images are expected to be missing for now. `public/assets/comparaciones/`
// is empty in the repo (U10 and the founder produce it, see the README), so the
// silhouette fallback is the normal case rather than an error path — the same
// arrangement `WeekHeroImage` has had for the week renders since G3.

const BOX_PX = 96;

export function ComparisonFigure({
  week,
  lengthCm,
  ink,
  boxPx = BOX_PX,
  illustrated = false,
}: {
  week: number;
  lengthCm: number | undefined;
  /** Follows the theme: `light` on `estrellas`, dark everywhere else. */
  ink: "dark" | "light";
  /** The box the larger of the two subjects fills. */
  boxPx?: number;
  /** Draw the baby (`BabyIllustration`) instead of the plain disc. */
  illustrated?: boolean;
}) {
  const comparison = comparisonFor(week);
  const { ref, failed: imgError, onError } = useImageFailed();

  const { babyPx, itemPx, clamped } = heroScale({
    babyCm: lengthCm,
    itemCm: comparison?.itemCm,
    boxPx,
  });

  // Nothing measurable this week (1–2) — the hero shows the baby alone.
  if (babyPx === null && itemPx === null) return null;
  if (!comparison) return null;

  const text = ink === "light" ? "rgba(255,255,255,0.88)" : "rgba(50,46,41,0.72)";
  const shape = ink === "light" ? "rgba(255,255,255,0.34)" : "rgba(50,46,41,0.22)";

  // Illustrated (the bare week card): the fruit waits for its image as a soft
  // dashed outline rather than a grey disc, and the caption sits under the
  // pair instead of squeezing into a column beside it.
  const itemFallbackStyle = illustrated
    ? {
        background: "rgba(255,255,255,0.5)",
        border: "2px dashed rgba(47,93,80,0.45)",
      }
    : { background: shape };

  return (
    <figure
      className={`m-0 flex gap-3 ${illustrated ? "flex-wrap items-end justify-center" : "items-end"}`}
      aria-hidden
    >
      {/* The baby, as a proportional blob. The real silhouette arrives with
          the renders; until then the SHAPE is the information — it is the
          right size next to the fruit, which is the whole claim. */}
      {babyPx !== null &&
        (illustrated ? (
          <span className="block shrink-0" style={{ width: babyPx, height: babyPx }}>
            <BabyIllustration week={week} size={babyPx} />
          </span>
        ) : (
          <span
            className="block shrink-0 rounded-full"
            style={{ width: babyPx, height: babyPx, background: shape }}
          />
        ))}

      {itemPx !== null && (
        <span
          className="block shrink-0"
          style={{ width: itemPx, height: itemPx }}
        >
          {imgError || !comparison.imageSrc ? (
            <span
              className="block h-full w-full rounded-full box-border"
              style={itemFallbackStyle}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={ref}
              src={comparison.imageSrc}
              alt=""
              className="block h-full w-full object-contain"
              onError={onError}
            />
          )}
        </span>
      )}

      <figcaption
        className={
          illustrated
            ? "w-full text-center text-xs font-bold leading-tight"
            : "pb-1 text-[10px] font-bold leading-tight"
        }
        style={{ color: text }}
      >
        {illustrated && "Tu bebé y "}
        {comparison.item}
        {clamped && (
          // The drawing is NOT to scale here, and saying so is the difference
          // between a helpful picture and a quiet lie. A week-3 embryo is 1/20
          // of a chía seed; drawn honestly it is invisible.
          <>
            <br />
            <span className="font-semibold opacity-80">
              {notToScaleCaption(lengthCm)}
            </span>
          </>
        )}
      </figcaption>
    </figure>
  );
}
