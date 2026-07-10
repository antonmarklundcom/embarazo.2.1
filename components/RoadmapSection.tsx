"use client";

import { useState } from "react";

// Roadmap placeholders (build spec §8). These are intentionally NON-functional:
// tapping shows a calm "Próximamente" message. No accounts, no backend.
const ITEMS = [
  {
    id: "comunidad",
    title: "Comunidad de mamás",
    desc: "Un espacio para compartir experiencias con otras embarazadas.",
  },
  {
    id: "pareja",
    title: "Compartir con tu pareja",
    desc: "Que tu pareja siga el embarazo semana a semana con vos.",
  },
  {
    id: "grupos",
    title: "Grupos de mamás cerca tuyo",
    desc: "Encuentros y grupos organizados en tu zona.",
  },
];

export function RoadmapSection() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section aria-labelledby="roadmap" className="space-y-3">
      <h2 id="roadmap" className="text-sm font-extrabold text-ink">
        Lo que viene en Mi Bebé
      </h2>
      <div className="space-y-3">
        {ITEMS.map((item) => {
          const isOpen = open === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpen(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              className="block w-full rounded-card border border-dashed border-petrol/25 bg-petrol/[0.03] p-4 text-left transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{item.desc}</p>
                </div>
                <span className="shrink-0 rounded-full bg-sand-bg px-2.5 py-0.5 text-xs font-medium text-sand-text">
                  Próximamente
                </span>
              </div>
              {isOpen && (
                <p className="mt-3 rounded-tile bg-white/70 px-3 py-2 text-sm text-ink">
                  Próximamente — estamos trabajando en esto.
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
