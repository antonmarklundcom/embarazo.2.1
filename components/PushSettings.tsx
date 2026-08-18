"use client";

import { useEffect, useState } from "react";

import {
  PUSH_CATEGORY_INFO,
  toggleCategory,
  type PushCategory,
} from "@/lib/push/categories";
import {
  disablePush,
  enablePush,
  readPushState,
  setCategories,
  type PushState,
} from "@/lib/push/client";

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

  useEffect(() => {
    // Reading the state never prompts — it only inspects.
    void readPushState().then(setState);
  }, []);

  if (!state) return null;

  async function turnOn() {
    setBusy(true);
    setMessage("");
    const status = await enablePush(state!.categories, companionAppointmentAt);
    setState({ ...state!, status });
    setBusy(false);

    if (status === "denied") {
      setMessage(
        "Tu navegador bloqueó los avisos. Podés habilitarlos desde la configuración del navegador, en los permisos de este sitio.",
      );
    } else if (status === "off") {
      // Dismissed rather than denied — the prompt can still be shown again.
      setMessage("No pasa nada: podés activarlos cuando quieras.");
    }
  }

  async function turnOff() {
    setBusy(true);
    setMessage("");
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
      <section className="rounded-card bg-white p-4 shadow-soft">
        <h3 className="text-base font-extrabold text-ink">Avisos</h3>

      {state.status === "unsupported" ? (
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Este navegador no puede mostrar avisos. Todo lo demás de Mi Bebé
          funciona igual.
        </p>
      ) : state.needsInstall ? (
        // Honest copy about iOS, as the task asks: on iPhone, Web Push only
        // works from an installed app. Saying so beats a toggle that fails.
        <p className="mt-1 text-sm leading-relaxed text-muted">
          En iPhone, los avisos funcionan solo si instalás Mi Bebé en la
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
