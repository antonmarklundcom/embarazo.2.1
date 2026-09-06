"use client";

import { useEffect, useRef } from "react";

import { THEME_IDS, heroTheme } from "@/lib/hero/themes";
import {
  setHeroTheme,
  setShowComparison,
  useHeroTheme,
  useShowComparison,
} from "@/lib/hero/preferences";
import { ThemeBackdrop } from "./ThemeBackdrop";

// U7 — the six swatches and the fruit toggle.
//
// A bottom sheet rather than a settings page, because the thing being chosen is
// visible behind it: she taps a swatch, the hero repaints underneath (the
// preference is a Dexie write and `useLiveQuery` does the rest), and she keeps
// or changes it while looking at it. A `/ajustes` row would make choosing a
// background a trip away from the background.
//
// Nothing here writes to `/ajustes` — U11 may add a row pointing at it.

export function ThemeSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const current = useHeroTheme();
  const showComparison = useShowComparison();
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes it. A sheet that traps a reader on a phone with a hardware
  // keyboard, or a mis-tap she cannot undo, is worse than no sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Fondo del bebé"
        tabIndex={-1}
        className="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-card bg-cream p-5 pb-8 shadow-soft outline-none"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" aria-hidden />

        <h2 className="text-base font-black text-ink">Fondo</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Elegí el fondo de tu bebé. Se guarda en tu cuenta, así que te sigue si
          entrás desde otro teléfono.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {THEME_IDS.map((id) => {
            const theme = heroTheme(id);
            const selected = id === current;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => void setHeroTheme(id)}
                className={`rounded-tile p-1 text-center transition active:scale-[0.97] ${
                  selected ? "ring-2 ring-petrol" : "ring-1 ring-line"
                }`}
              >
                <span className="relative block h-16 w-full overflow-hidden rounded-tile">
                  <ThemeBackdrop theme={id} />
                </span>
                <span className="mt-1 block text-[11px] font-bold text-ink">
                  {theme.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-ink">Mostrar la fruta</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              La comparación de tamaño con una fruta o verdura, al lado del
              bebé.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showComparison}
            aria-label="Mostrar la comparación de tamaño"
            onClick={() => void setShowComparison(!showComparison)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              showComparison ? "bg-petrol" : "bg-line"
            }`}
          >
            <span
              className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
              style={{ left: showComparison ? 26 : 4 }}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 min-h-[44px] w-full rounded-tile bg-petrol text-sm font-extrabold text-white"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
