"use client";

import { useId, useState, type ReactNode } from "react";

// Proposal "Hoy corto" — one row on Hoy that opens a group of blocks on tap.
//
// Closed by default. The content is mounted the first time the row opens and
// stays mounted after that, so a closed section costs no rendering and
// reopening one does not reset what is inside it. Nothing is persisted.
export function HomeSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const id = useId();
  const panelId = `${id}-panel`;

  return (
    // The panel sits under the row, not inside its card: the blocks it holds
    // are cards (and edge-to-edge rails) of their own.
    <div>
      <h2 className="rounded-card border border-line bg-white">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setMounted(true);
            setOpen((value) => !value);
          }}
          className="flex min-h-[56px] w-full items-center gap-3 rounded-card px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-petrol"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-extrabold leading-snug tracking-tight text-ink">
              {title}
            </span>
            <span className="block text-xs font-semibold text-muted">{hint}</span>
          </span>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-petrol transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h2>
      <div id={panelId} hidden={!open} className="pt-5">
        {mounted ? children : null}
      </div>
    </div>
  );
}
