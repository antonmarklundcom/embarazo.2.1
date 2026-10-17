"use client";

import { useEffect, useState } from "react";

import { APP_NAME } from "@/lib/brand";
import { enableWeekStartNotice, isIosWithoutInstall, pushResyncPending, readPushState, type PushStatus } from "@/lib/push/client";

import { BackButton, PrimaryButton } from "./controls";

/**
 * Outer cap on "Sí" before onboarding finishes anyway. It must sit above the
 * 25 s `enablePush` itself gives a slow first service-worker install, plus time
 * to answer the permission prompt, so it only fires when something is truly stuck.
 */
const SUBSCRIBE_WAIT_MS = 45_000;
/** Past this, say what is happening instead of a silent "Un momento…". */
const PREPARING_AFTER_MS = 2000;

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
  const [preparing, setPreparing] = useState(false);
  // "pending" (a PushStatus) = the service worker was still not ready after the
  // long explicit wait: not a refusal, and worth another try. "unconfirmed" =
  // she is subscribed here but the server has not stored it yet (or the outer
  // cap fired).
  const [result, setResult] = useState<PushStatus | "unconfirmed" | "error" | null>(null);

  useEffect(() => {
    void readPushState().catch(() => undefined);
  }, []);

  async function yes() {
    if (isIosWithoutInstall()) {
      setIosNote(true);
      return;
    }
    setBusy(true);
    setResult(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const preparingTimer = setTimeout(() => setPreparing(true), PREPARING_AFTER_MS);
    try {
      // Capped: `navigator.serviceWorker.ready` never settles on a device where
      // the service worker did not register, and onboarding must not hang on
      // "Un momento…". Past the cap the subscription may still finish on its own.
      const status = await Promise.race([
        enableWeekStartNotice(),
        new Promise<"unconfirmed">((resolve) => { timer = setTimeout(() => resolve("unconfirmed"), SUBSCRIBE_WAIT_MS); }),
      ]);
      setResult(status === "on" && pushResyncPending() ? "unconfirmed" : status);
    } catch {
      setResult("error");
    } finally {
      clearTimeout(timer);
      clearTimeout(preparingTimer);
      setPreparing(false);
      setBusy(false);
    }
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
      {result && (
        <p role="status" className="mt-3 text-sm font-semibold text-ink">
          {result === "on" ? "Listo: activaste el aviso de tu semana nueva. Los demás avisos se eligen en Ajustes."
            : result === "denied" ? "Tu navegador bloqueó los avisos. Podés permitirlos en la configuración del sitio y volver a Ajustes."
            : result === "unconfigured" ? "Los avisos todavía no están disponibles. Podés seguir y revisar Ajustes más adelante."
            : result === "unsupported" ? "Este navegador no admite estos avisos. Podés usar la app igual."
            : result === "off" ? "No activaste los avisos. Podés hacerlo después en Ajustes."
            : result === "pending" ? "Todavía no pudimos preparar los avisos. Probá de nuevo en un momento."
            : "Todavía no pudimos confirmar la activación. Revisá los avisos en Ajustes cuando tengas conexión."}
        </p>
      )}
      {preparing && !result && (
        <p role="status" className="mt-3 text-sm font-semibold text-ink">
          Preparando los avisos en este teléfono…
        </p>
      )}

      {iosNote ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            En iPhone, los avisos funcionan solo si instalás {APP_NAME} en la
            pantalla de inicio. Tocá <strong>Compartir</strong> y después{" "}
            <strong>Agregar a inicio</strong>; después activalos en Ajustes.
          </p>
          <PrimaryButton label="Entendido, empezar" onClick={onFinish} />
        </>
      ) : result === "pending" ? (
        <>
          <PrimaryButton label="Probar de nuevo" onClick={() => void yes()} />
          <button
            type="button"
            onClick={onFinish}
            className="mt-2 min-h-[44px] w-full rounded-tile border border-line px-4 text-sm font-bold text-ink"
          >
            Continuar
          </button>
        </>
      ) : result ? (
        <PrimaryButton label="Continuar" onClick={onFinish} />
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
