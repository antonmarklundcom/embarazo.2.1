"use client";

import Link from "next/link";
import { useState } from "react";

import { trimesterToDos } from "@/lib/checklistTrimesters";
import {
  CHECKLIST_TRIMESTER_COPY as COPY,
  TRIMESTER_CHIPS,
  TRIMESTER_LABELS,
} from "@/lib/i18n/es-PY/checklist";
import type { Trimester } from "@/lib/types";

// The checklist's view by trimester: the week tips that are to-dos, grouped,
// each a link to the week it comes from (`lib/checklistTrimesters.ts`). It
// stores nothing; it opens on her current trimester when the app knows it.

const TRIMESTERS: Trimester[] = [1, 2, 3];

export function TrimesterToDos({ current }: { current?: Trimester }) {
  const [picked, setPicked] = useState<Trimester | null>(null);
  const trimester = picked ?? current ?? 1;
  const items = trimesterToDos(trimester);

  return (
    <section
      aria-labelledby="checklist-trimestre"
      className="rounded-card bg-white p-4 shadow-soft"
    >
      <h2 id="checklist-trimestre" className="text-base font-extrabold text-ink">
        {COPY.title}
      </h2>
      <p className="mt-1 text-sm text-muted">{COPY.intro}</p>

      <div role="group" aria-label={COPY.filterLabel} className="mt-3 flex flex-wrap gap-2">
        {TRIMESTERS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={t === trimester}
            onClick={() => setPicked(t)}
            className={`min-h-[36px] flex-1 rounded-tile px-3 text-[13px] font-extrabold transition ${
              t === trimester ? "bg-pastel-lavanda text-ink" : "bg-pastel-arena/50 text-muted"
            }`}
          >
            {TRIMESTER_CHIPS[t]}
          </button>
        ))}
      </div>

      <h3 className="mt-4 text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        {TRIMESTER_LABELS[trimester]}
      </h3>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.week}>
            <Link
              href={item.href}
              className="block rounded-tile border border-line bg-cream px-3 py-2.5 transition active:bg-black/5"
            >
              <span className="block text-[11px] font-extrabold uppercase tracking-[1px] text-petrol">
                {COPY.week(item.week)}
              </span>
              <span className="mt-0.5 block text-sm text-ink">{item.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
