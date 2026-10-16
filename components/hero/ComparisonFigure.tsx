"use client";
import { useImageFailed } from "@/lib/hooks/useImageFailed";
import { WeekBabyFigure } from "./WeekBabyFigure";
import { RealisticPicture } from "@/components/RealisticPicture";
import { comparisonFor, ILLUSTRATION_CAPTION } from "@/lib/seed/comparisons";

// Fruit shapes and curled baby art cannot be compared using head-to-heel cm.
// Draw these as illustrations and always caption them as not to scale.
export function ComparisonFigure({ week, lengthCm, ink, boxPx = 96, illustrated = false }: {
  week: number; lengthCm: number | undefined; ink: "dark" | "light";
  boxPx?: number; illustrated?: boolean;
}) {
  const comparison = comparisonFor(week);
  const { ref, failed, onError } = useImageFailed();
  if (!comparison || !lengthCm || !Number.isFinite(lengthCm)) return null;
  const text = ink === "light" ? "rgba(255,255,255,0.88)" : "rgba(50,46,41,0.72)";
  const itemPx = Math.round(boxPx * 0.72);
  return <figure className="m-0 flex flex-wrap items-end justify-center gap-3">
    {illustrated && <span aria-hidden className="block shrink-0" style={{width:boxPx,height:boxPx}}>
      <WeekBabyFigure week={week} size={boxPx} />
    </span>}
    <span aria-hidden className="flex shrink-0 items-center justify-center" style={{width:itemPx,height:itemPx}}>
      {failed ? <span className="text-5xl">🍃</span> : (
        <RealisticPicture
          imageRef={ref}
          canonicalSrc={comparison.imageSrc}
          alt=""
          sizes={`${itemPx}px`}
          width={itemPx}
          height={itemPx}
          className="block h-full w-full object-contain"
          onError={onError}
        />
      )}
    </span>
    <figcaption className="w-full text-center text-[11px] font-semibold leading-relaxed" style={{color:text}}>
      {ILLUSTRATION_CAPTION}
    </figcaption>
  </figure>;
}
