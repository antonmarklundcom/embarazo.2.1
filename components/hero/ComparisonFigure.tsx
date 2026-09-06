"use client";

import { useState } from "react";

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
}: {
  week: number;
  lengthCm: number | undefined;
  /** Follows the theme: `light` on `estrellas`, dark everywhere else. */
  ink: "dark" | "light";
}) {
  const comparison = comparisonFor(week);
  const [imgError, setImgError] = useState(false);

  const { babyPx, itemPx, clamped } = heroScale({
    babyCm: lengthCm,
    itemCm: comparison?.itemCm,
    boxPx: BOX_PX,
  });

  // Nothing measurable this week (1–2) — the hero shows the baby alone.
  if (babyPx === null && itemPx === null) return null;
  if (!comparison) return null;

  const text = ink === "light" ? "rgba(255,255,255,0.88)" : "rgba(50,46,41,0.72)";
  const shape = ink === "light" ? "rgba(255,255,255,0.34)" : "rgba(50,46,41,0.22)";

  return (
    <figure className="m-0 flex items-end gap-3" aria-hidden>
      {/* The baby, as a proportional blob. The real silhouette arrives with
          the renders; until then the SHAPE is the information — it is the
          right size next to the fruit, which is the whole claim. */}
      {babyPx !== null && (
        <span
          className="block shrink-0 rounded-full"
          style={{ width: babyPx, height: babyPx, background: shape }}
        />
      )}

      {itemPx !== null && (
        <span
          className="block shrink-0"
          style={{ width: itemPx, height: itemPx }}
        >
          {imgError || !comparison.imageSrc ? (
            <span
              className="block h-full w-full rounded-full"
              style={{ background: shape }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comparison.imageSrc}
              alt=""
              className="block h-full w-full object-contain"
              onError={() => setImgError(true)}
            />
          )}
        </span>
      )}

      <figcaption className="pb-1 text-[10px] font-bold leading-tight" style={{ color: text }}>
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
