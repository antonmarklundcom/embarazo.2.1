"use client";

// The floating week render for the signed-out account entry (/cuenta). Same
// treatment as Hoy's hero (components/home/WeekHero.tsx): a warm glow, the
// cream-backed studio art melted into the light theme with multiply, and a
// radial mask feathering the square away. Existing art only; if the file is
// missing the glow stays and nothing breaks.

import { RealisticPicture } from "@/components/RealisticPicture";
import { hasWeekArt, weekArtSrc } from "@/lib/hero/weekArt";
import { useImageFailed } from "@/lib/hooks/useImageFailed";

/** Mid-pregnancy: the render that reads as "a baby" to everyone. */
export const WELCOME_WEEK = 24;

const MASK = "radial-gradient(closest-side, #000 74%, transparent 100%)";

export function WelcomeBaby({
  size,
  alt,
  priority = false,
}: {
  size: number;
  /** Empty string when the baby is decoration next to a heading that says it all. */
  alt: string;
  priority?: boolean;
}) {
  const { ref, failed, onError } = useImageFailed();
  const showArt = hasWeekArt(WELCOME_WEEK) && !failed;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <span
        aria-hidden
        className="absolute inset-2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,250,244,0.95), rgba(255,250,244,0.6) 62%, rgba(255,250,244,0) 100%)",
        }}
      />
      {showArt && (
        <RealisticPicture
          imageRef={ref}
          canonicalSrc={weekArtSrc(WELCOME_WEEK)}
          sizes={`${size}px`}
          alt={alt}
          fetchPriority={priority ? "high" : undefined}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 block h-full w-full object-cover motion-safe:animate-[welcome-float_6s_ease-in-out_infinite]"
          style={{
            objectPosition: "center 40%",
            mixBlendMode: "multiply",
            maskImage: MASK,
            WebkitMaskImage: MASK,
          }}
          onError={onError}
        />
      )}
    </div>
  );
}
