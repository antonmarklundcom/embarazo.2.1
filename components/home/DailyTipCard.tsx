import { EditorialPicture } from "@/components/EditorialPicture";

// Only exact topics receive art. New or unmatched tips remain text-only;
// neither the day nor the trimester selects an unrelated generic picture.
const TIP_IMAGES: Readonly<Record<string, string>> = {
  "t-01": "hydration",
  "t-05": "seasonal-fruit",
  "t-06": "wash-produce",
  "t-13": "small-meals",
  "t-19": "folic-acid",
  "t-51": "legumes",
  "t-52": "meal-citrus",
  "t-60": "hydration",
};

export function DailyTipCard({ text, tipId }: { text: string; tipId?: string }) {
  const imageId = tipId ? TIP_IMAGES[tipId] : undefined;

  return (
    <section aria-labelledby="tip-de-hoy" className="rounded-card border border-line bg-white p-4">
      <p id="tip-de-hoy" className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Tip de hoy
      </p>
      {imageId && (
        <EditorialPicture
          id={imageId}
          className="mt-3 aspect-[16/9] w-full rounded-[16px]"
        />
      )}
      <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">
        {text}
      </p>
    </section>
  );
}
