"use client";

import { useRef, useState } from "react";

import { perspectivesFor } from "@/lib/seed/perspectives";
import type { Role } from "@/lib/db";

// BUILD-PLAN C4 — perspective switcher (feature map #13).
//
// The same week with three entrances. It exists because a pregnancy app that
// only ever addresses the pregnant person leaves the two people most likely to
// be reading over her shoulder with nothing concrete to do.
//
// B1 already asked the user who they are, so the switcher **opens on their own
// perspective** instead of making a papá tap past the "para vos" tab every
// week. The other two are one tap away; nothing is hidden by role, which is
// deliberate — the pregnant user reading the "para tu pareja" tab is the point
// of it, and half of what it is for is being able to show it to somebody.

type PerspectiveId = "vos" | "pareja" | "familia";

const TAB_LABELS: Record<PerspectiveId, string> = {
  vos: "Para vos",
  pareja: "Para tu pareja",
  familia: "Para la familia",
};

const ORDER: PerspectiveId[] = ["vos", "pareja", "familia"];

/**
 * Where each role lands first. `acompanante` opens on "para tu pareja" because
 * what a birth companion actually does — logistics, being there, talking to
 * the team — is what that tab describes, whatever the relationship is.
 */
const ROLE_DEFAULT: Record<Role, PerspectiveId> = {
  mama: "vos",
  papa: "pareja",
  acompanante: "pareja",
  familiar: "familia",
};

export function PerspectiveSwitcher({ week, role }: { week: number; role: Role }) {
  const bands = perspectivesFor(week);
  const [active, setActive] = useState<PerspectiveId>(ROLE_DEFAULT[role] ?? "vos");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  if (!bands) return null;

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + ORDER.length) % ORDER.length;
    setActive(ORDER[next]!);
    buttons.current[next]?.focus();
  }

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Esta semana, para cada uno
      </h2>

      <div
        role="tablist"
        aria-label="Elegí para quién"
        className="-mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {ORDER.map((id, index) => (
          <button
            key={id}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`perspectiva-tab-${id}`}
            aria-selected={id === active}
            aria-controls="perspectiva-panel"
            tabIndex={id === active ? 0 : -1}
            onClick={() => setActive(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`min-h-[36px] shrink-0 rounded-tile px-3.5 text-[13px] font-extrabold transition ${
              id === active ? "bg-pastel-lavanda text-ink" : "bg-pastel-arena/50 text-muted"
            }`}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="perspectiva-panel"
        aria-labelledby={`perspectiva-tab-${active}`}
        className="mt-3"
      >
        <p className="text-[15px] font-semibold leading-relaxed text-ink">
          {bands[active]}
        </p>
      </div>
    </section>
  );
}
