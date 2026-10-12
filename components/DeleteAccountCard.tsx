"use client";

import { useRef, useState } from "react";

import {
  deleteAccountAction,
  type DeleteAccountState,
} from "@/app/(app)/ajustes/actions";
import { AccountDeletionError, deleteSignedInAccount } from "@/lib/sync/accountDeletion";

// Complete the server deletion before local cleanup can revoke the account gate.

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [wipeDevice, setWipeDevice] = useState(true);
  const [wiping, setWiping] = useState(false);
  const [state, setState] = useState<DeleteAccountState>({});
  const busy = useRef(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    busy.current = true;
    setWiping(true);
    setState({});
    try {
      const result = await deleteSignedInAccount(async (expectedAccountId) => {
        data.set("expectedAccountId", expectedAccountId);
        return deleteAccountAction({}, data);
      }, wipeDevice);
      window.location.replace("/cuenta?cuenta=borrada" + (result.cleanupFailed ? "&limpieza=pendiente" : !wipeDevice ? "&local=conservado" : ""));
    } catch (error) {
      setState({error: error instanceof AccountDeletionError ? error.message : "No pudimos completar el borrado. Probá de nuevo."});
      busy.current = false;
      setWiping(false);
    }
  }

  return (
    <section className="rounded-card border border-terracotta/30 bg-terracotta/5 p-4">
      <h2 className="text-base font-extrabold text-terracotta">
        Borrar mi cuenta
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Borramos del servidor todo lo tuyo: tus registros sincronizados, tu
        embarazo, las personas invitadas, las notificaciones y las imágenes
        generadas. Esta acción elimina los datos activos de la cuenta y no se puede deshacer.
      </p>

      {state.error && (
        <p className="mt-2 text-sm font-semibold text-terracotta">
          {state.error}
        </p>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-white px-4 py-2.5 text-sm font-extrabold text-terracotta shadow-soft transition active:scale-[0.99]"
        >
          Borrar mi cuenta
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-3 space-y-3"
        >
          <input type="hidden" name="confirm" value="borrar" />

          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={wipeDevice}
              onChange={(e) => setWipeDevice(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-terracotta"
            />
            <span>
              Borrar también los datos de este teléfono (incluidas tus fotos,
              aunque hayas activado su copia remota).
            </span>
          </label>

          {!wipeDevice && <p className="text-sm text-muted">Exportá una copia antes de confirmar. Los registros que conserves seguirán vinculados a la cuenta eliminada y no se abrirán con otra cuenta.</p>}
          <p className="text-sm font-extrabold text-ink">
            ¿Seguro? Esta acción es definitiva.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={wiping}
              className="min-h-[44px] flex-1 rounded-tile bg-terracotta px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {wiping ? "Borrando…" : "Sí, borrar mi cuenta"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={wiping}
              className="min-h-[44px] flex-1 rounded-tile bg-white px-4 py-2.5 text-sm font-extrabold text-petrol shadow-soft"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
