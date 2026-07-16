"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

// P1.1 (BUILD-PLAN.md): "Instalar la app" — shown on Home + Ajustes only
// while installable and not already standalone. Chrome/Android gets the
// native prompt; iOS Safari (no beforeinstallprompt) gets a share-sheet
// instruction sheet instead.
export function InstallCard() {
  const { canPromptInstall, promptInstall, showIosInstructions, isStandalone } =
    useInstallPrompt();
  const [showSheet, setShowSheet] = useState(false);

  if (isStandalone || (!canPromptInstall && !showIosInstructions)) return null;

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Instalá la app
      </p>
      <h3 className="mt-1 text-base font-extrabold text-ink">
        Agregá Mi Bebé a tu pantalla de inicio
      </h3>
      <p className="mt-1 text-sm font-semibold text-muted">
        Accedé más rápido y usala sin conexión.
      </p>
      <button
        type="button"
        onClick={() => (canPromptInstall ? promptInstall() : setShowSheet(true))}
        className="mt-3 rounded-full bg-terracotta px-4 py-2.5 text-sm font-extrabold text-white transition active:scale-95"
      >
        Instalar la app
      </button>

      {showSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowSheet(false)}
        >
          <div
            className="w-full max-w-md rounded-t-card bg-white p-5"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-extrabold text-ink">
              Agregar a la pantalla de inicio
            </h4>
            <ol className="mt-3 space-y-2 text-sm font-semibold text-ink">
              <li>1. Tocá el ícono de compartir (▢↑) en Safari.</li>
              <li>2. Elegí &ldquo;Agregar a inicio&rdquo;.</li>
              <li>3. Confirmá tocando &ldquo;Agregar&rdquo;.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowSheet(false)}
              className="mt-4 w-full rounded-full border border-line py-2.5 text-sm font-extrabold text-ink"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
