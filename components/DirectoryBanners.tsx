"use client";

import { useState } from "react";

import { placesLabel, type CategoryBanner } from "@/lib/directoryBanners";
import type { DirectoryCategory } from "@/lib/types";

// BUILD-PLAN D5 — the banner grid (feature map #26).
//
// Each banner carries a photograph when one exists at
// `/assets/directorio/<category>.webp`, and a pastel block when it does not —
// the same fallback-on-error pattern as the week hero. That is what lets this
// ship before the founder has licensed photography: the grid looks deliberate
// today and lights up on its own when G4 drops the files in, with no code
// change and nothing invented in the meantime.

export function DirectoryBanners({
  banners,
  onPick,
}: {
  banners: CategoryBanner[];
  onPick: (category: DirectoryCategory) => void;
}) {
  if (banners.length === 0) return null;

  return (
    <section aria-labelledby="categorias" className="space-y-2.5">
      <h2
        id="categorias"
        className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
      >
        Categorías
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {banners.map((banner) => (
          <Banner key={banner.key} banner={banner} onPick={onPick} />
        ))}
      </div>
    </section>
  );
}

function Banner({
  banner,
  onPick,
}: {
  banner: CategoryBanner;
  onPick: (category: DirectoryCategory) => void;
}) {
  const [noImage, setNoImage] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onPick(banner.key)}
      className={`relative flex h-24 flex-col justify-end overflow-hidden rounded-card p-3 text-left transition active:scale-[0.98] ${
        noImage ? banner.tone : "bg-pastel-arena"
      }`}
    >
      {!noImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner.image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setNoImage(true)}
          />
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(50,46,41,0) 40%, rgba(50,46,41,0.62) 100%)",
            }}
          />
        </>
      )}
      <span
        className={`relative text-sm font-extrabold leading-tight ${
          noImage ? "text-ink" : "text-white"
        }`}
      >
        {banner.title}
      </span>
      <span
        className={`relative mt-0.5 text-[11px] font-bold ${
          noImage ? "text-ink/70" : "text-white/90"
        }`}
      >
        {placesLabel(banner.count)}
      </span>
    </button>
  );
}
