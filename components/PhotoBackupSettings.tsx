"use client";

import { useEffect, useState } from "react";

import { isPhotoBackupOn, setPhotoBackup, syncPhotos } from "@/lib/photos/client";

// BUILD-PLAN K4 — the opt-in, and the consent copy that goes with it.
//
// ARCHITECTURE.md §4.4 said photos never leave the device. K4 amends that to an
// explicit opt-in, and the amendment is only honest if this card says *exactly*
// what is stored — which is the task's own last acceptance criterion. So the
// copy names the three things a reasonable person would want to know before
// deciding, in her words rather than ours:
//
//   • what goes up (the photo files themselves)
//   • who can reach them (only her, through a link that expires; not her
//     familia, not us in the admin panel)
//   • how to undo it (one tap, and the copies are deleted straight away)
//
// The card renders nothing when the deployment cannot store photos or the user
// has no account: an opt-in for something that cannot happen is not a choice,
// it is a broken switch.

type State = "loading" | "unavailable" | "off" | "on";

export function PhotoBackupSettings({ groupTitle }: { groupTitle?: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // One probe answers both questions: 404 means this deployment has no
      // photo storage (or no account), anything else means the feature exists.
      let available = false;
      try {
        const res = await fetch("/api/v1/photos");
        available = res.ok;
      } catch {
        available = false;
      }
      const on = await isPhotoBackupOn();
      if (cancelled) return;
      setState(available ? (on ? "on" : "off") : on ? "on" : "unavailable");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading" || state === "unavailable") return null;

  const on = state === "on";

  async function toggle() {
    const next = !on;
    setBusy(true);
    setMessage("");
    const ok = await setPhotoBackup(next);
    if (!ok) {
      setBusy(false);
      setMessage(
        next
          ? "No pudimos activarlo. Probá de nuevo cuando tengas internet."
          : "Guardamos que lo apagaste, pero no pudimos borrar las copias todavía. Lo intentamos de nuevo cuando tengas internet.",
      );
      setState(next ? "on" : "off");
      return;
    }
    setState(next ? "on" : "off");
    if (next) {
      const summary = await syncPhotos();
      setMessage(
        summary.outcome === "ok"
          ? `Listo. ${summary.uploaded} foto${summary.uploaded === 1 ? "" : "s"} guardada${summary.uploaded === 1 ? "" : "s"}.`
          : "Activado. Vamos a subirlas cuando tengas internet.",
      );
    } else {
      setMessage("Apagado. Borramos las copias del servidor.");
    }
    setBusy(false);
  }

  return (
    <section className="space-y-2">
      {groupTitle && (
        <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-[1.6px] text-muted">
          {groupTitle}
        </h2>
      )}

      <div className="rounded-card border border-line bg-white p-4 shadow-soft">
        <h3 className="text-[15px] font-extrabold text-ink">
          Copia de tus fotos
        </h3>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-muted">
          Si perdés el teléfono o cambiás de aparato, tus fotos de la panza y de
          tu carné vuelven cuando entrás con tu cuenta.
        </p>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy}
          onClick={() => void toggle()}
          className={`mt-3 flex min-h-[44px] w-full items-center gap-3 rounded-tile border px-3 py-2.5 text-left disabled:opacity-60 ${
            on ? "border-petrol/30 bg-pastel-salvia" : "border-line bg-cream"
          }`}
        >
          <span
            aria-hidden
            className={`flex h-6 w-10 shrink-0 items-center rounded-full px-0.5 transition ${
              on ? "justify-end bg-petrol" : "justify-start bg-ink/20"
            }`}
          >
            <span className="h-5 w-5 rounded-full bg-white" />
          </span>
          <span className="text-sm font-extrabold text-ink">
            Guardar mis fotos en mi cuenta
          </span>
        </button>

        {/* The consent copy. Exactly what is stored, who can reach it, and how
            to undo it — no euphemisms, because §4.4 used to promise the
            opposite and this is what replaces that promise. */}
        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-ink/80">
          <li>
            • Se suben <strong>las fotos</strong> de la panza y del carné, tal
            como están, y la fecha y la semana de cada una.
          </li>
          <li>
            • Se guardan a tu nombre. Solo vos las podés abrir, con un enlace que
            vence a los pocos minutos. <strong>No son públicas.</strong>
          </li>
          <li>
            • Tu pareja y tu familia <strong>no</strong> las ven, salvo que
            enciendas «fotos de la panza» en Familia.
          </li>
          <li>
            • Nosotros no las miramos: no aparecen en ningún panel nuestro.
          </li>
          <li>
            • Si apagás esto, borramos las copias del servidor en ese momento.
            Si borrás tu cuenta, no queda ninguna.
          </li>
        </ul>

        {message && (
          <p role="status" className="mt-3 text-sm font-semibold text-petrol">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
