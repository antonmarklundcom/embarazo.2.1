"use client";

import Link from "next/link";
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
  // Browsing this card never changes the pregnancy dates or hero.
  const [selection, setSelection] = useState({ currentWeek: week, selectedWeek: week });
  // Clear the remembered browse week on *every* real-week change, including
  // a date correction/restore that later returns to an earlier week.
  if (selection.currentWeek !== week) {
    setSelection({ currentWeek: week, selectedWeek: week });
  }
  const selectedWeek = selection.currentWeek === week ? selection.selectedWeek : week;
  const bands = perspectivesFor(selectedWeek);
  const touch = useRef<{ x: number; y: number } | null>(null);

  function selectWeek(next: number) {
    if (next < 1 || next > 42 || !perspectivesFor(next)) return;
    setSelection({ currentWeek: week, selectedWeek: next });
  }
  const [active, setActive] = useState<PerspectiveId>(ROLE_DEFAULT[role] ?? "vos");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  if (!bands) return null;

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const edge = event.key === "Home" ? 0 : event.key === "End" ? ORDER.length - 1 : null;
    if (delta === 0 && edge === null) return;
    event.preventDefault();
    const next = edge ?? (index + delta + ORDER.length) % ORDER.length;
    setActive(ORDER[next]!);
    buttons.current[next]?.focus();
  }

  return (
    <section aria-label="Esta semana, para cada uno" className="rounded-card border border-line bg-white p-4 text-left text-ink shadow-soft">
      <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Esta semana, para cada uno
      </h2>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" aria-label="Semana anterior" disabled={selectedWeek <= 1} onClick={() => selectWeek(selectedWeek - 1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-petrol disabled:opacity-30">
          <span aria-hidden>←</span>
        </button>
        <div className="text-center">
          <p className="text-lg font-black" aria-live="polite" aria-atomic="true">Semana {selectedWeek}</p>
          {selectedWeek === week ? (
            <p className="text-xs text-muted">Tu semana actual</p>
          ) : (
            <div>
              <p className="text-xs text-muted">Explorando semana {selectedWeek}</p>
              <button type="button" onClick={() => selectWeek(week)} className="min-h-11 text-xs font-bold text-petrol underline">Volver a mi semana</button>
            </div>
          )}
        </div>
        <button type="button" aria-label="Semana siguiente" disabled={selectedWeek >= 42} onClick={() => selectWeek(selectedWeek + 1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-petrol disabled:opacity-30">
          <span aria-hidden>→</span>
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Elegí para quién"
        className="mt-4 grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3"
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
            className={`min-h-11 min-w-0 rounded-tile px-3 py-2 text-[13px] font-extrabold leading-snug transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol last:col-span-2 sm:last:col-span-1 ${
              id === active ? "bg-pastel-lavanda text-ink" : "bg-pastel-arena/50 text-ink/80"
            }`}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        tabIndex={0}
        id="perspectiva-panel"
        aria-labelledby={`perspectiva-tab-${active}`}
        className="border-t border-line pt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol"
        style={{ touchAction: "pan-y pinch-zoom" }}
        onTouchStart={(event) => {
          const point = event.touches[0];
          touch.current = event.touches.length === 1 && point ? { x: point.clientX, y: point.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = touch.current;
          touch.current = null;
          const end = event.changedTouches[0];
          if (!start || !end) return;
          const dx = end.clientX - start.x;
          const dy = end.clientY - start.y;
          if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) selectWeek(selectedWeek + (dx < 0 ? 1 : -1));
        }}
        onTouchCancel={() => { touch.current = null; }}
      >
        <p className="text-[15px] font-semibold leading-relaxed text-ink">
          {bands[active]}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p className="text-xs text-muted">Deslizá el texto para cambiar de semana. Algunos consejos abarcan varias semanas y pueden repetirse.</p>
        <Link href={`/semana/${selectedWeek}`} className="inline-flex min-h-11 items-center text-xs font-extrabold text-petrol underline">
          Detalles de la semana
        </Link>
      </div>
    </section>
  );
}
