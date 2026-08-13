"use client";

import { useRef, useState } from "react";

import { getWeek } from "@/lib/weeks";
import { formatCm, limbSize } from "@/lib/seed/limbSizes";

// BUILD-PLAN C3 — size comparison tabs (feature map #12).
//
// Three ways to answer the same question about the same week: the whole baby
// ("como una mandioca", plus cm and g), the foot, and the hand. The
// Paraguayan comparisons are the point — a fruit list translated from a
// Swedish app is the thing this product exists not to be — so they stay, and
// the tabs sit beside them rather than replacing them.
//
// A tab whose data does not exist is **not rendered**. Before week 9 there is
// no foot to measure, and the card degrades to the single "tamaño" tab it has
// always been able to show rather than to an empty panel.

type TabId = "tamano" | "pie" | "mano";

interface Tab {
  id: TabId;
  label: string;
  value: string;
  comparison: string;
}

export function SizeTabs({ week }: { week: number }) {
  const info = getWeek(week);
  const limbs = limbSize(week);

  const measures = [
    info.lengthCm ? `≈ ${formatCm(info.lengthCm)}` : null,
    info.weightG ? `≈ ${info.weightG} g` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const tabs: Tab[] = [
    {
      id: "tamano",
      label: "Tamaño",
      value: measures || "Todavía sin medida",
      comparison: info.sizeComparison,
    },
  ];
  if (limbs?.footCm) {
    tabs.push({
      id: "pie",
      label: "Pie",
      value: `≈ ${formatCm(limbs.footCm)}`,
      comparison: limbs.footComparison ?? "",
    });
  }
  if (limbs?.handCm) {
    tabs.push({
      id: "mano",
      label: "Mano",
      value: `≈ ${formatCm(limbs.handCm)}`,
      comparison: limbs.handComparison ?? "",
    });
  }

  const [active, setActive] = useState<TabId>("tamano");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // A week can go from three tabs to one (or the user can move on), so never
  // trust the remembered id — fall back to the first tab, which always exists.
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0]!;

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + tabs.length) % tabs.length;
    setActive(tabs[next]!.id);
    buttons.current[next]?.focus();
  }

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Qué tan grande está
      </h2>

      {tabs.length > 1 && (
        <div role="tablist" aria-label="Comparación de tamaño" className="mt-2.5 flex gap-2">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`size-tab-${tab.id}`}
              aria-selected={tab.id === current.id}
              aria-controls="size-tabpanel"
              tabIndex={tab.id === current.id ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`min-h-[36px] rounded-tile px-3.5 text-[13px] font-extrabold transition ${
                tab.id === current.id
                  ? "bg-pastel-celeste text-ink"
                  : "bg-pastel-arena/50 text-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div
        role="tabpanel"
        id="size-tabpanel"
        aria-labelledby={`size-tab-${current.id}`}
        className="mt-3"
      >
        <p className="text-[15px] font-semibold leading-relaxed text-ink">
          {current.comparison
            ? `Como ${current.comparison}.`
            : "Todavía sin comparación para esta semana."}
        </p>
        <p className="mt-1 text-sm font-bold text-muted">{current.value}</p>
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        Son promedios aproximados. Cada bebé crece a su ritmo, y lo que dice tu
        control prenatal vale más que cualquier tabla.
      </p>
    </section>
  );
}
