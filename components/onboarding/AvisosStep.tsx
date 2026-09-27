"use client";

import { useState } from "react";

import { APP_NAME } from "@/lib/brand";
import { enableWeekStartNotice, isIosWithoutInstall } from "@/lib/push/client";

import { BackButton, PrimaryButton } from "./controls";

/** How long "Sí" may wait for the browser before onboarding finishes anyway. */
const SUBSCRIBE_WAIT_MS = 8000;

/**
 * Growth plan item 8 — "¿Te aviso cuando empieza tu semana nueva?", the last
 * onboarding step.
 *
 * The permission prompt is shown only after she taps "Sí": a browser lets an
 * app ask once, and a prompt nobody asked for gets a "no" that is forever.
 * "Sí" goes through `enableWeekStartNotice`, the same one-tap path Hoy's new-week
 * card uses, so `Notification.requestPermission()` still lives in one function.
 * On an iPhone without the app installed there is nothing to ask for yet, so
 * the step says so (Ajustes' copy) instead of showing a prompt that would fail.
 * Whatever the answer, onboarding finishes: a "no" changes nothing else.
 */
export function AvisosStep({
  onFinish,
  onBack,
}: {
  onFinish: () => void;
  onBack: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [iosNote, setIosNote] = useState(false);

  async function yes() {
    if (isIosWithoutInstall()) {
      setIosNote(true);
      return;
    }
    setBusy(true);
    try {
      // Capped: `navigator.serviceWorker.ready` never settles on a device where
      // the service worker did not register, and onboarding must not hang on
      // "Un momento…". Past the cap the subscription may still finish on its own.
      await Promise.race([
        enableWeekStartNotice(),
        new Promise((resolve) => setTimeout(resolve, SUBSCRIBE_WAIT_MS)),
      ]);
    } catch {
      // A failed subscription is not a reason to keep her in onboarding.
    } finally {
      setBusy(false);
    }
    onFinish();
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-soft">
      <h2 className="text-lg font-extrabold text-ink">
        ¿Te aviso cuando empieza tu semana nueva?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Un aviso el día que empieza cada semana, con lo que está pasando. El
        aviso se arma en tu teléfono, y lo apagás cuando quieras en Ajustes.
      </p>

      {iosNote ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            En iPhone, los avisos funcionan solo si instalás {APP_NAME} en la
            pantalla de inicio. Tocá <strong>Compartir</strong> y después{" "}
            <strong>Agregar a inicio</strong>; después activalos en Ajustes.
          </p>
          <PrimaryButton label="Entendido, empezar" onClick={onFinish} />
        </>
      ) : (
        <>
          <PrimaryButton
            label={busy ? "Un momento…" : "Sí, avisame"}
            disabled={busy}
            onClick={() => void yes()}
          />
          <button
            type="button"
            disabled={busy}
            onClick={onFinish}
            className="mt-2 min-h-[44px] w-full rounded-tile border border-line px-4 text-sm font-bold text-ink disabled:opacity-40"
          >
            Ahora no
          </button>
        </>
      )}
      <BackButton onClick={onBack} />
    </div>
  );
}
