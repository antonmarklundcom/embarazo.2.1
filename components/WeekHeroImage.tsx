"use client";

import { useState } from "react";

// Weekly "bebé a las N semanas" hero (Mi Bebé design). Loads the render from
// public/assets/semanas/bebe-<week>.webp when the founder has added it
// (REDESIGN-PLAN.md §4); falls back to the arena block with the week number
// so the layout never breaks before images land.
export function WeekHeroImage({
  week,
  trimester,
  sizeComparison,
  lengthCm,
  weightG,
}: {
  week: number;
  trimester: number;
  sizeComparison: string;
  lengthCm?: number;
  weightG?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const measures = [
    lengthCm ? `≈ ${lengthCm} cm` : null,
    weightG ? `≈ ${weightG} g` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative overflow-hidden rounded-card bg-pastel-arena shadow-soft">
      {imgError ? (
        <div className="flex h-[240px] items-center justify-center">
          <span className="text-[120px] font-black leading-none text-white">
            {week}
          </span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/assets/semanas/bebe-${week}.webp`}
          alt={`Tu bebé a las ${week} semanas`}
          className="block h-[280px] w-full object-cover"
          style={{ objectPosition: "center 18%" }}
          onError={() => setImgError(true)}
        />
      )}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(50,46,41,0) 44%, rgba(50,46,41,0.6) 100%)",
        }}
      />
      <div className="absolute inset-x-5 bottom-5">
        <p className="text-[11px] font-extrabold tracking-[1.6px] text-[#FBE9D8]">
          SEMANA {week} · {trimester}.º TRIMESTRE
        </p>
        <p className="mt-1 text-3xl font-black text-white">Semana {week}</p>
        <p className="mt-1 text-sm font-bold text-white/90">
          Del tamaño de {sizeComparison}
        </p>
        {measures && (
          <p className="mt-0.5 text-xs font-bold text-white/75">{measures}</p>
        )}
      </div>
    </div>
  );
}
