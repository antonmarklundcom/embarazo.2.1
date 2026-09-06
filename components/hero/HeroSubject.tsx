"use client";

import { useState } from "react";

import { ThemeBackdrop } from "./ThemeBackdrop";
import { useHeroTheme } from "@/lib/hero/preferences";
import { heroTheme, themeInk } from "@/lib/hero/themes";

// U7 — the baby on the chosen background, sized by whatever frames it.
//
// Extracted so the home screen's circular ring hero and any future frame show
// the same subject on the same theme without either one re-deriving "which
// image, which fallback, which background". The home hero is the LCP element,
// which is why `fetchPriority="high"` lives here rather than being remembered
// at each call site.
//
// `object-cover` here, unlike the big card's `object-contain`: this fills a
// circle cut out of the ring, and a contained image inside a circle leaves
// four corners of empty theme.
export function HeroSubject({
  week,
  alt,
  priority = true,
}: {
  week: number;
  alt: string;
  priority?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const themeId = useHeroTheme();
  const ink = themeInk(heroTheme(themeId));

  // Weeks 1–2: no embryo, so no subject — the theme alone, which is the honest
  // rendering of "todavía no hay embrión".
  const hasSubject = week >= 3;

  return (
    <span className="relative block h-full w-full">
      <ThemeBackdrop theme={themeId} />
      {hasSubject && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/semanas/bebe-${week}.webp`}
          alt={alt}
          className="relative block h-full w-full object-cover"
          style={{ objectPosition: "center 18%" }}
          fetchPriority={priority ? "high" : undefined}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="relative flex h-full items-center justify-center">
          <span
            className="text-5xl font-black leading-none"
            style={{ color: ink.strong, opacity: 0.6 }}
          >
            {week}
          </span>
        </span>
      )}
    </span>
  );
}
