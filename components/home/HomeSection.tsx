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
  const hintId = `${id}-hint`;

  return (
    // The panel sits under the row, not inside its card: the blocks it holds
    // are cards (and edge-to-edge rails) of their own.
    <div>
      <div className="relative flex min-h-[56px] items-center gap-3 rounded-card border border-line bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2>
            {/* The button's name is the title alone and the hint is its
                description, so a hint cannot collide with a query for another
                control's name. Its ::after covers the whole card, so the hint
                and the chevron are part of the tap target too. */}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              aria-describedby={hintId}
              onClick={() => {
                setMounted(true);
                setOpen((value) => !value);
              }}
              className="block text-left text-lg font-extrabold leading-snug tracking-tight text-ink outline-none after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-petrol"
            >
              {title}
            </button>
          </h2>
          <p id={hintId} className="text-xs font-semibold text-muted">
            {hint}
          </p>
        </div>
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
          className={`pointer-events-none shrink-0 text-petrol transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      <div id={panelId} hidden={!open} className="pt-5">
        {mounted ? children : null}
      </div>
    </div>
  );
}
