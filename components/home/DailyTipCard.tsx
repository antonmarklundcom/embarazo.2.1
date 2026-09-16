// W4: the "Tip de hoy" card, moved verbatim out of `app/(app)/page.tsx`.
// The tip itself is still chosen on the route (`getDailyTip(week, trimester)`)
// and handed down, so this stays a presentational card.

export function DailyTipCard({ text }: { text: string }) {
  return (
    <section className="rounded-card border border-line bg-white p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Tip de hoy
      </p>
      <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">
        {text}
      </p>
    </section>
  );
}
