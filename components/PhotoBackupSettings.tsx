"use client";

import { useEffect, useState } from "react";

import {
  isPhotoBackupOn,
  pendingPhotoDeletions,
  setPhotoBackup,
  syncPhotos,
  type PhotoBackupSummary,
} from "@/lib/photos/client";
import { ensureAccountLink } from "@/lib/sync/client";

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
//   • how to undo it (one tap, and the copies are deleted)
//
// The card renders nothing when the deployment cannot store photos or the user
// has no account: an opt-in for something that cannot happen is not a choice,
// it is a broken switch.
//
// 2026-10 review:
// - F10/N2: the switch was the only control, so the only way to "retry" a
//   restore on a new phone was off-then-on — and "off" deletes every copy.
//   There is now "Sincronizar ahora", and "off" asks first.
// - F03: "off" no longer claims a deletion the server did not confirm.
// - F01: on a phone whose data belongs to another account, the card explains
//   instead of acting on the signed-in account's copies.
// - F09: there is no photo sharing with family; the copy no longer offers it.

type State = "loading" | "unavailable" | "off" | "on" | "mismatch";

/**
 * F15: availability is a question about the deployment, not a reason to list
 * (and sign a download URL for) every photo. A cursor past every row answers it
 * with an empty page.
 */
const PROBE = `/api/v1/photos?since=${Number.MAX_SAFE_INTEGER}`;

function summaryMessage(summary: PhotoBackupSummary): string {
  if (summary.outcome === "account-mismatch") {
    return "Las fotos de este teléfono son de otra cuenta, así que no las subimos ni bajamos con esta.";
  }
  if (summary.outcome !== "ok") {
    return "Vamos a sincronizar tus fotos cuando tengas internet.";
  }
  const parts: string[] = [];
  if (summary.uploaded > 0) {
    parts.push(`${summary.uploaded} foto${summary.uploaded === 1 ? "" : "s"} guardada${summary.uploaded === 1 ? "" : "s"}`);
  }
  if (summary.restored > 0) {
    parts.push(`${summary.restored} recuperada${summary.restored === 1 ? "" : "s"}`);
  }
  const pending = summary.pending ?? 0;
  const head = parts.length > 0 ? `Listo: ${parts.join(", ")}.` : "Listo. Tus fotos están al día.";
  return pending > 0
    ? `${head} Quedan ${pending} por subir; lo intentamos de nuevo cuando tengas mejor conexión.`
    : head;
}

export function PhotoBackupSettings({ groupTitle }: { groupTitle?: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [confirmingOff, setConfirmingOff] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // One probe answers both questions: 404 means this deployment has no
      // photo storage (or no account), anything else means the feature exists.
      let available = false;
      try {
        const res = await fetch(PROBE);
        available = res.ok;
      } catch {
        available = false;
      }
      const on = await isPhotoBackupOn();
      const link = available ? await ensureAccountLink() : null;
      if (cancelled) return;
      if (link?.status === "mismatch") {
        setState("mismatch");
        return;
      }
      setState(available ? (on ? "on" : "off") : on ? "on" : "unavailable");
      if (pendingPhotoDeletions() > 0) {
        setMessage(
          "Todavía no pudimos confirmar que se borraron algunas copias del servidor. Lo seguimos intentando cada vez que abrís la app con internet.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading" || state === "unavailable") return null;

  const on = state === "on";

  async function turnOn() {
    setBusy(true);
    setMessage("");
    const change = await setPhotoBackup(true);
    if (change === "failed") {
      setMessage("No pudimos activarlo. Probá de nuevo.");
      setBusy(false);
      return;
    }
    setState("on");
    const summary = await syncPhotos();
    setMessage(
      summary.outcome === "ok"
        ? summaryMessage(summary)
        : "Activado. Vamos a subirlas cuando tengas internet.",
    );
    setBusy(false);
  }

  async function turnOff() {
    setConfirmingOff(false);
    setBusy(true);
    setMessage("");
    const change = await setPhotoBackup(false);
    setBusy(false);
    if (change === "failed") {
      setMessage("No pudimos apagarlo. Probá de nuevo.");
      return;
    }
    setState("off");
    setMessage(
      change === "done"
        ? "Apagado. Borramos las copias del servidor. Las fotos de este teléfono siguen acá."
        : change === "account-mismatch"
          ? "Lo apagamos en este teléfono. Sus fotos son de otra cuenta, así que no tocamos las copias de la cuenta con la que entraste."
          : "Apagado. Todavía no pudimos borrar todas las copias del servidor: lo seguimos intentando cada vez que abras la app con internet.",
    );
  }

  async function syncNowClicked() {
    setBusy(true);
    setMessage("");
    setMessage(summaryMessage(await syncPhotos()));
    setBusy(false);
  }

  if (state === "mismatch") {
    return (
      <section className="space-y-2">
        {groupTitle && (
          <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-[1.6px] text-muted">
            {groupTitle}
          </h2>
        )}
        <div className="rounded-card border border-line bg-white p-4 shadow-soft">
          <h3 className="text-[15px] font-extrabold text-ink">Copia de tus fotos</h3>
          <p role="status" className="mt-1 text-sm leading-relaxed text-muted">
            Las fotos guardadas en este teléfono son de otra cuenta, así que no
            las subimos a esta ni bajamos acá las de esta cuenta. Si son tuyas,
            volvé a entrar con la cuenta de antes; si querés empezar de cero
            con esta, borrá los datos del teléfono desde Ajustes.
          </p>
        </div>
      </section>
    );
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
          onClick={() => (on ? setConfirmingOff(true) : void turnOn())}
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

        {confirmingOff && (
          <div className="mt-3 space-y-2 rounded-tile border border-terracotta/30 bg-terracotta/5 p-3">
            <p className="text-sm text-ink">
              Al apagarlo <strong>borramos las copias de tus fotos del
              servidor</strong>, también para tus otros aparatos. Las fotos de
              este teléfono no se borran. ¿Lo apagamos?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void turnOff()}
                className="min-h-[44px] flex-1 rounded-tile bg-terracotta px-4 py-2.5 text-sm font-medium text-white"
              >
                Sí, apagar y borrar las copias
              </button>
              <button
                type="button"
                onClick={() => setConfirmingOff(false)}
                className="min-h-[44px] flex-1 rounded-tile bg-white px-4 py-2.5 text-sm font-medium text-petrol shadow-soft"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {on && !confirmingOff && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void syncNowClicked()}
            className="mt-2 min-h-[44px] w-full rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol disabled:opacity-60"
          >
            {busy ? "Sincronizando…" : "Sincronizar ahora"}
          </button>
        )}

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
            • Tu pareja y tu familia <strong>no</strong> las ven.
          </li>
          <li>
            • Nosotros no las miramos: no aparecen en ningún panel nuestro.
          </li>
          <li>
            • Si apagás esto, borramos las copias del servidor (si no hay
            conexión, en cuanto vuelva). Si borrás tu cuenta, no queda ninguna.
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
