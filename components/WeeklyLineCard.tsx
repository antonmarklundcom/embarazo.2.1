"use client";

import { weeklyLine } from "@/lib/seed/weeklyLines";

// BUILD-PLAN C2 — the weekly one-liner (feature map #11).
//
// The first block in C1's slot area: one concrete sentence about what is
// happening this week, directly under the hero, before anything the app wants
// the user to do. It answers the question somebody opens a pregnancy app to
// ask, in the two seconds they give it.
//
// When there is no line for a week, this renders **nothing** — not an empty
// card, not "próximamente". The 42 strings and the code that shows them land
// on different schedules, and a gap nobody can see is better than a promise.

export function WeeklyLineCard({ week }: { week: number }) {
  const line = weeklyLine(week);
  if (!line) return null;

  return (
    <section
      aria-labelledby="esta-semana"
      className="rounded-card bg-pastel-arena p-4"
    >
      <h2
        id="esta-semana"
        className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
      >
        Esta semana
      </h2>
      <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">
        {line}
      </p>
    </section>
  );
}
