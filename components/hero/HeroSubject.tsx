"use client";

import { useImageFailed } from "@/lib/hooks/useImageFailed";
import { RealisticPicture } from "@/components/RealisticPicture";

import { ThemeBackdrop } from "./ThemeBackdrop";
import { useHeroTheme } from "@/lib/hero/preferences";
import { fallbackInk, heroTheme } from "@/lib/hero/themes";
import { hasWeekArt, weekArtAlt, weekArtSrc } from "@/lib/hero/weekArt";

// The home ring's subject shares the weekly renderer and chosen theme.
// Current cream-backed studio art resolves through responsive AVIF/WebP mapping;
// the legacy WEEK_ART_STYLE="cutout" value remains for layout compatibility.
// The ring clips the image to a circle, so object-cover fills its existing frame.
// Preserve high priority here because this is the home screen's LCP image.
export function HeroSubject({
  week,
  alt,
  priority = true,
}: {
  week: number;
  alt: string;
  priority?: boolean;
}) {
  const { ref, failed: imgError, onError } = useImageFailed();
  const themeId = useHeroTheme();
  const numberInk = fallbackInk(heroTheme(themeId));

  // weekArt owns availability: weeks 1–2 have no embryo and show the theme.
  // The original revision-bearing URL remains the fallback if no mapped asset
  // exists; the historical framed set keeps its calendar behavior.
  const hasSubject = hasWeekArt(week);

  return (
    <span className="relative block h-full w-full">
      <ThemeBackdrop theme={themeId} />
      {hasSubject && !imgError ? (
        <RealisticPicture
          imageRef={ref}
          canonicalSrc={weekArtSrc(week)}
          sizes="208px"
          alt={weekArtAlt(week) ?? alt}
          className="relative block h-full w-full object-cover"
          style={{ objectPosition: "center 18%" }}
          fetchPriority={priority ? "high" : undefined}
          onError={onError}
        />
      ) : (
        <span className="relative flex h-full items-center justify-center">
          <span
            className="text-5xl font-black leading-none"
            style={{ color: numberInk, opacity: 0.6 }}
          >
            {week}
          </span>
        </span>
      )}
    </span>
  );
}
