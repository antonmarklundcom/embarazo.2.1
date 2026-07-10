"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

// Install card (build plan P1.1). Renders nothing when the app is already
// installed or the browser gives no install signal, so it's safe to drop on
// any screen. Chromium → native prompt button; iOS Safari → instructions.
export function InstallCard() {
  const state = useInstallPrompt();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (state.kind === "unavailable") return null;

  return (
    <section className="rounded-card border border-petrol/20 bg-petrol/5 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-petrol">
        Instalá la app
      </p>
      <h3 className="mt-1 text-base font-medium text-ink">
        Tenela siempre a mano, incluso sin internet
      </h3>
      <p className="mt-1 text-sm text-muted">
        Se instala en tu teléfono como cualquier app, sin ocupar casi espacio
        y sin pasar por una tienda.
      </p>

      {state.kind === "prompt" ? (
        <button
          type="button"
          onClick={() => state.promptInstall()}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Instalar
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setShowIosHelp((v) => !v)}
            aria-expanded={showIosHelp}
            className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
          >
            Cómo instalar en iPhone
          </button>
          {showIosHelp && (
            <ol className="mt-3 space-y-2 rounded-tile bg-white/70 p-3 text-sm text-ink">
              <li>
                1. Tocá el botón <strong>Compartir</strong> (el cuadrado con la
                flecha hacia arriba), abajo en Safari.
              </li>
              <li>
                2. Elegí <strong>Agregar a la pantalla de inicio</strong>.
              </li>
              <li>
                3. Tocá <strong>Agregar</strong>. Listo: te queda como una app
                más.
              </li>
            </ol>
          )}
        </>
      )}
    </section>
  );
}
