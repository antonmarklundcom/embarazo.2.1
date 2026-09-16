// W4: moved verbatim out of `app/(app)/page.tsx`. The placeholder "Hoy"
// renders while the first IndexedDB read is in flight — and again, from
// `NoPregnancyYet`, while a companion's shared view is still loading.

export function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-full animate-pulse rounded-tile bg-black/5" />
      <div className="h-[340px] animate-pulse rounded-card bg-black/5" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-tile bg-black/5" />
        ))}
      </div>
    </div>
  );
}
