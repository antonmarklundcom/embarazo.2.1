"use client";

import { useImageFailed } from "@/lib/hooks/useImageFailed";
import { RealisticPicture } from "@/components/RealisticPicture";
import { WEEK_ART_STYLE, hasWeekArt, weekArtSrc } from "@/lib/hero/weekArt";
import { BabyIllustration } from "./BabyIllustration";

// The baby beside the week's comparison, at the caller's existing size.
// The legacy "cutout" style value preserves layout compatibility; current art
// uses an opaque cream studio background through RealisticPicture's responsive
// mapping. Rounded corners make that background an intentional tile on themes.
// Missing art, weeks 1–2 and load failures retain the drawn fallback. Decorative:
// the caption continues to provide the week and measurements in words.
export function WeekBabyFigure({ week, size }: { week: number; size: number }) {
  const { ref, failed, onError } = useImageFailed();
  if (WEEK_ART_STYLE !== "cutout" || !hasWeekArt(week) || failed) {
    return <BabyIllustration week={week} size={size} />;
  }
  return (
    <RealisticPicture
      imageRef={ref}
      canonicalSrc={weekArtSrc(week)}
      sizes={`${size}px`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className="block rounded-2xl object-contain"
      style={{ width: size, height: size }}
      onError={onError}
    />
  );
}
