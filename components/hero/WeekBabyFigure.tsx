"use client";

import { useImageFailed } from "@/lib/hooks/useImageFailed";
import { WEEK_ART_STYLE, hasWeekArt, weekArtSrc } from "@/lib/hero/weekArt";
import { BabyIllustration } from "./BabyIllustration";

// 2026-09-28 — the baby beside the week's fruit, at a size the caller works out.
//
// With the cutout renders on disk this is the week's render; without them (the
// framed set, weeks 1–2, or a file that fails to load) it is the drawn baby it
// always was. Decorative: the caption says the size in words.
export function WeekBabyFigure({ week, size }: { week: number; size: number }) {
  const { ref, failed, onError } = useImageFailed();
  if (WEEK_ART_STYLE !== "cutout" || !hasWeekArt(week) || failed) {
    return <BabyIllustration week={week} size={size} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={weekArtSrc(week)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className="block object-contain"
      style={{ width: size, height: size }}
      onError={onError}
    />
  );
}
