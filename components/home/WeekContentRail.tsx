// W4: C2–C5 of "Hoy" — the four cards that are *about this week* — moved
// verbatim out of `app/(app)/page.tsx`. They are one group because they take
// one input, the week, and each one decides for itself whether it has anything
// to say for that week.
//
// Returns a fragment, so all four stay direct children of the page's
// `space-y-4` stack and keep their spacing. Every card is the same
// `next/dynamic` component from `dynamicSections` as before.

import type { Role } from "@/lib/db";

import {
  ObstetraCard,
  PerspectiveSwitcher,
  SizeTabs,
  WeeklyLineCard,
} from "./dynamicSections";

export function WeekContentRail({ week, role }: { week: number; role: Role }) {
  return (
    <>
      {/* C2: the weekly one-liner (map #11). Renders nothing for a week with
          no line yet. */}
      <WeeklyLineCard week={week} />

      {/* C3: size comparison tabs (map #12) — tamaño / pie / mano. */}
      <SizeTabs week={week} />

      {/* C4: same week, three entrances (map #13). Opens on the user's own
          role; nothing is hidden by role. */}
      <PerspectiveSwitcher week={week} role={role} />

      {/* C5: one bylined note per week (map #14). Renders only when a real
          medical reviewer is configured — the byline IS the gate. */}
      <ObstetraCard week={week} />
    </>
  );
}
