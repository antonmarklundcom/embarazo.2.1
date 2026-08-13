"use client";

import { useId, useState } from "react";

import { faqFor } from "@/lib/seed/faq";
import type { FaqTopic } from "@/lib/types";

// BUILD-PLAN E6 — the FAQ accordion (feature map #29).
//
// Accessible by construction rather than by styling a `<details>`: each
// question is a real button carrying `aria-expanded` and `aria-controls`, and
// each answer is a region labelled by its question. That is what a screen
// reader needs to announce "expandido / contraído", which `<details>` still
// does inconsistently across the browsers this app has to run in.
//
// More than one answer can be open at a time. An accordion that closes the
// previous answer is a nice animation and a bad reading experience for
// somebody comparing "¿quién ve mis datos?" with "¿qué pasa si borro la app?".

export function FaqAccordion({
  topics,
  title,
}: {
  /** Which subjects this embed asks for. Omitted means all of them. */
  topics?: readonly FaqTopic[];
  title?: string;
}) {
  const entries = faqFor(topics);
  const baseId = useId();
  const [open, setOpen] = useState<Set<string>>(new Set());

  if (entries.length === 0) return null;

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="space-y-2.5">
      {title && (
        <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-card border border-line bg-white">
        {entries.map((entry) => {
          const expanded = open.has(entry.id);
          const buttonId = `${baseId}-${entry.id}-q`;
          const panelId = `${baseId}-${entry.id}-a`;
          return (
            <div key={entry.id} className="border-b border-line last:border-b-0">
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggle(entry.id)}
                  className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="text-sm font-extrabold leading-snug text-ink">
                    {entry.question}
                  </span>
                  <span
                    aria-hidden
                    className={`shrink-0 text-lg text-petrol transition-transform ${
                      expanded ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!expanded}
                className="px-4 pb-4"
              >
                <p className="text-sm leading-relaxed text-muted">{entry.answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
