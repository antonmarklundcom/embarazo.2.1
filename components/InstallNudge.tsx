"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { APP_NAME } from "@/lib/brand";
import {
  INSTALL_NUDGE_KEY,
  nudgeContextFor,
  parseNudgeMemory,
  showInstallNudge,
  type NudgeContext,
  type NudgeMemory,
} from "@/lib/install/offer";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { flush, noteInstall, readState } from "@/lib/stats/funnel.client";

// Night run item 2 — a compact install prompt at the moments it is useful:
// right after onboarding, after the first tool, and on public week and guide
// pages. The full instructions stay in `InstallCard` (Hoy's footer, Ajustes);
// this is one line, one button and "Ahora no", remembered on this device only
// (`INSTALL_NUDGE_KEY`). It never opens anything by itself: the browser's own
// install dialog appears only when she taps "Instalar".

function readMemory(): NudgeMemory {
  try {
    return parseNudgeMemory(localStorage.getItem(INSTALL_NUDGE_KEY));
  } catch {
    return {};
  }
}

function writeMemory(memory: NudgeMemory): void {
  try {
    localStorage.setItem(INSTALL_NUDGE_KEY, JSON.stringify(memory));
  } catch {
    // Storage blocked: the prompt may show again, nothing else breaks.
  }
}

export function InstallNudge({ context }: { context: NudgeContext }) {
  const { canPromptInstall, promptInstall, isStandalone, device, playUrl } = useInstallPrompt();
  // Decided once per mount, after the device is known, so marking the moment
  // "seen" does not hide the prompt she is looking at.
  const [visible, setVisible] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (visible !== null || !device) return;
    const memory = readMemory();
    // "After onboarding" means onboarding finished on this device with the
    // funnel counter on — not every long-time user's next visit to Hoy.
    const justOnboarded = context !== "onboarded" || readState().onboardedAt !== undefined;
    const show = justOnboarded && showInstallNudge({ context, memory, standalone: isStandalone, device });
    setVisible(show);
    if (!show) return;
    if (context !== "public") {
      writeMemory({ ...memory, seen: [...(memory.seen ?? []), context] });
    }
    noteInstall("prompt");
    void flush();
  }, [context, device, isStandalone, visible]);

  if (!visible || hidden || isStandalone) return null;

  function dismiss() {
    writeMemory({ ...readMemory(), dismissed: true });
    setHidden(true);
  }

  const howTo =
    device === "iphone"
      ? "En Safari: Compartir → Agregar a la pantalla de inicio."
      : "En Chrome: menú ⋮ → Instalar app.";

  return (
    <section
      aria-label={`Instalar ${APP_NAME}`}
      data-install-nudge={context}
      className="rounded-card border border-line bg-pastel-celeste/60 p-4"
    >
      <p className="text-sm font-extrabold text-ink">Tené {APP_NAME} a un toque</p>
      <p className="mt-1 text-sm text-ink">
        Instalala en tu teléfono: abre más rápido y funciona sin internet.
        {!canPromptInstall && !playUrl && ` ${howTo}`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {playUrl && (
          <a
            href={playUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-extrabold text-white"
          >
            Disponible en Google Play
          </a>
        )}
        {canPromptInstall && (
          <button
            type="button"
            onClick={() => void promptInstall().catch(() => undefined)}
            className="min-h-11 rounded-full bg-terracotta px-4 text-sm font-extrabold text-white"
          >
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 rounded-full px-3 text-sm font-bold text-petrol underline underline-offset-4"
        >
          Ahora no
        </button>
      </div>
    </section>
  );
}

/**
 * The shell's slot: the first tool screen after onboarding, and the public
 * week and guide pages. Hoy renders its own `onboarded` prompt.
 */
export function InstallNudgeSlot() {
  const pathname = usePathname();
  const [onboarded, setOnboarded] = useState(false);
  useEffect(() => {
    // Only devices that finished onboarding with the funnel counter on.
    setOnboarded(readState().onboardedAt !== undefined);
  }, [pathname]);
  const context = nudgeContextFor(pathname, onboarded);
  if (!context) return null;
  return (
    <div className="mt-6">
      <InstallNudge key={context === "public" ? pathname : context} context={context} />
    </div>
  );
}
