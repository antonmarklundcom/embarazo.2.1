"use client";

import { useEffect, useState } from "react";

import { APP_NAME } from "@/lib/brand";
import {
  PUSH_CATEGORY_INFO,
  toggleCategory,
  type PushCategory,
} from "@/lib/push/categories";
import {
  disablePush,
  enablePush,
  pushResyncPending,
  readPushState,
  sendTestNotification,
  setCategories,
  type PushState,
  type PushTestResult,
} from "@/lib/push/client";

/** What each test outcome tells her, in the words she will act on. */
const TEST_MESSAGES: Record<PushTestResult, string> = {
  sent: "Listo: el aviso de prueba ya salió. Si no aparece en unos segundos, revisá que el sitio tenga permiso de notificaciones en tu teléfono.",
  scheduled: `Cerrá ${APP_NAME} ahora (volvé a la pantalla de inicio). En unos 20 segundos te llega el aviso de prueba; tocalo para volver acá.`,
  "not-subscribed": "Este teléfono no tiene los avisos guardados en tu cuenta. Tocá «Desactivar avisos» y después «Activar avisos» para volver a guardarlos.",
  "signed-out": "Para probar los avisos tenés que entrar con tu cuenta en este teléfono.",
  "rate-limited": "Ya enviamos varias pruebas. Esperá un minuto y probá de nuevo.",
  offline: "Sin internet no podemos enviar la prueba. Conectate y probá de nuevo.",
  failed: "El servicio de avisos no respondió. Probá de nuevo en un rato.",
};

// BUILD-PLAN B5 — the notification settings.
//
// This component is the ONLY place in the app that can trigger a permission
// prompt. That is the task's requirement and it is also the only way it works:
// the browser shows the prompt once ever, and an app that spends it on a
// first-visit pop-up is an app whose reminders can never be turned on again.

export function PushSettings({
  groupTitle,
  companionAppointmentAt = null,
}: {
  groupTitle?: string;
  /**
   * K8 — the control of the pregnancy this device accompanies, if any.
   *
   * It rides through here because the server stores a list of fire times and
   * replaces it on every publish: enabling push or changing a category would
   * otherwise silently drop the companion reminder. It is passed in rather than
   * read from storage because a companion view is never cached (K2).
   */
  companionAppointmentAt?: number | null;
}) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    // Reading the state never prompts — it only inspects.
    void readPushState().then(setState);
    // Tapping the test notification lands here (PUSH_TEST_URL): say so, so the
    // tap destination is something she can confirm rather than infer.
    if (new URLSearchParams(window.location.search).get("avisos") === "prueba") {
      setTestMessage("¡Funciona! Llegaste acá tocando el aviso de prueba.");
      document.getElementById("avisos")?.scrollIntoView({ block: "center" });
    }
  }, []);

  // Arriving from the test notification, say so at once: reading the push
  // state can wait up to 6 s for the service worker.
  if (!state) return testMessage ? <p role="status" className="text-sm text-ink">{testMessage}</p> : null;

  async function turnOn() {
    setBusy(true);
    setMessage("");
    const status = await enablePush(state!.categories, companionAppointmentAt);
    setState({ ...state!, status });
    setBusy(false);

    if (status === "on" && pushResyncPending()) {
      // N5: the browser subscription exists, but the server did not store the
      // schedule. Said plainly instead of a switch that only looks on.
      setMessage(
        "Activamos los avisos en este teléfono, pero no pudimos guardarlos todavía. Lo intentamos de nuevo la próxima vez que abras la app con internet.",
      );
    } else if (status === "denied") {
      setMessage(
        "Tu navegador bloqueó los avisos. Podés habilitarlos desde la configuración del navegador, en los permisos de este sitio.",
      );
    } else if (status === "off") {
      // Dismissed rather than denied — the prompt can still be shown again.
      setMessage("No pasa nada: podés activarlos cuando quieras.");
    }
  }

  async function sendTest(delayMs: 0 | 20_000) {
    setTesting(true);
    setTestMessage("");
    setTestMessage(TEST_MESSAGES[await sendTestNotification(delayMs)]);
    setTesting(false);
  }

  async function turnOff() {
    setBusy(true);
    setMessage("");
    setTestMessage("");
    const status = await disablePush();
    setState({ ...state!, status });
    setBusy(false);
  }

  async function onToggleCategory(category: PushCategory, on: boolean) {
    const next = toggleCategory(state!.categories, category, on);
    setState({ ...state!, categories: next });
    await setCategories(next, companionAppointmentAt);
  }

  // Push is not configured in this deployment. Say nothing rather than show a
  // toggle that cannot work — same rule as the account block in local-only
  // mode.
  if (state.status === "unconfigured") return null;

  return (
    <div className="space-y-3">
      {groupTitle && (
        <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          {groupTitle}
        </h2>
      )}
      <section id="avisos" className="scroll-mt-24 rounded-card bg-white p-4 shadow-soft">
        <h3 className="text-base font-extrabold text-ink">Avisos</h3>

      {state.status === "unsupported" ? (
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Este navegador no puede mostrar avisos. Todo lo demás de {APP_NAME}
          funciona igual.
        </p>
      ) : state.needsInstall ? (
        // Honest copy about iOS, as the task asks: on iPhone, Web Push only
        // works from an installed app. Saying so beats a toggle that fails.
        <p className="mt-1 text-sm leading-relaxed text-muted">
          En iPhone, los avisos funcionan solo si instalás {APP_NAME} en la
          pantalla de inicio. Tocá <strong>Compartir</strong> y después{" "}
          <strong>Agregar a inicio</strong>; después volvé acá.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Te avisamos el día antes de tu control. El aviso se arma en tu
            teléfono: nuestro servidor sabe <em>cuándo</em> avisarte, nunca qué
            dice el mensaje ni de qué control se trata.
          </p>

          {state.status === "denied" ? (
            <p className="mt-3 rounded-tile bg-cream p-3 text-sm text-ink">
              Los avisos están bloqueados para este sitio en tu navegador.
              Cambialo desde los permisos del sitio y volvé acá.
            </p>
          ) : (
            <button
              type="button"
              onClick={state.status === "on" ? turnOff : turnOn}
              disabled={busy}
              className={`mt-3 min-h-[44px] w-full rounded-tile px-4 py-2.5 text-sm font-extrabold transition active:scale-[0.99] disabled:opacity-60 ${
                state.status === "on"
                  ? "bg-cream text-petrol"
                  : "bg-petrol text-white"
              }`}
            >
              {busy
                ? "Un momento…"
                : state.status === "on"
                  ? "Desactivar avisos"
                  : "Activar avisos"}
            </button>
          )}

          {message && <p className="mt-2 text-sm text-muted">{message}</p>}

          {state.status === "on" && (
            <div className="mt-4 rounded-tile bg-cream/60 p-3">
              <h4 className="text-sm font-extrabold text-ink">Probar los avisos</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Te mandamos un aviso de prueba a este teléfono. No cambia tus
                fechas ni tus controles.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void sendTest(20_000)}
                  disabled={testing}
                  className="min-h-[44px] rounded-tile bg-petrol px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
                >
                  {testing ? "Un momento…" : "Probar con la app cerrada"}
                </button>
                <button
                  type="button"
                  onClick={() => void sendTest(0)}
                  disabled={testing}
                  className="min-h-[44px] rounded-tile border border-line bg-white px-4 py-2 text-sm font-extrabold text-petrol disabled:opacity-60"
                >
                  Enviar ahora
                </button>
              </div>
            </div>
          )}

          {testMessage && (
            <p role="status" className="mt-2 text-sm text-ink">{testMessage}</p>
          )}

          {state.status === "on" && (
            <ul className="mt-4 space-y-3">
              {PUSH_CATEGORY_INFO.map((category) => {
                const on = state.categories.includes(category.key);
                return (
                  <li key={category.key}>
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) =>
                          void onToggleCategory(category.key, e.target.checked)
                        }
                        className="mt-1 h-5 w-5 shrink-0 accent-petrol"
                      />
                      <span>
                        <span className="block text-sm font-extrabold text-ink">
                          {category.label}
                        </span>
                        <span className="block text-xs leading-relaxed text-muted">
                          {category.description}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      </section>
    </div>
  );
}
