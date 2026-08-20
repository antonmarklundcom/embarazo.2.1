"use client";

import { useActionState, useRef, useState } from "react";

import {
  deleteAccountAction,
  type DeleteAccountState,
} from "@/app/(app)/ajustes/actions";
import { wipeAllData } from "@/lib/db";
import { clearOnboardingDraft } from "@/lib/onboarding/draftStorage";
import { clearPin } from "@/lib/crypto";
import { purgePrivateCaches } from "@/lib/sw/privateCaches";

// BUILD-PLAN A5 — "Borrar mi cuenta", two taps from Ajustes: one to open the
// confirmation, one to confirm. No separate page, no settings sub-menu.
//
// ARCHITECTURE.md §8 requires the device wipe to be offered *in the same
// flow*, not as a second chore the user has to remember. It is a checkbox
// here, and it runs BEFORE the server call: if the network drops halfway, a
// user who asked for their phone to be wiped has had their phone wiped, which
// is the failure that leaves them least exposed.

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [wipeDevice, setWipeDevice] = useState(true);
  const [wiping, setWiping] = useState(false);
  const [state, formAction, pending] = useActionState<
    DeleteAccountState,
    FormData
  >(deleteAccountAction, {});

  // K14: set once the pre-submit work is done, so the `requestSubmit()` below
  // does not re-enter this handler and start over.
  const preparedRef = useRef(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (preparedRef.current) return;
    event.preventDefault();
    const form = event.currentTarget;
    setWiping(true);

    // K14: unconditional, and first. The device-wipe checkbox is about *her*
    // data; the service worker's cached copies of /familia and
    // /api/v1/sharing are ours, and leaving them readable offline after the
    // account is gone is the same failure K14 exists to fix. There is no
    // version of "delete my account" where they should survive.
    await purgePrivateCaches();

    if (wipeDevice) {
      try {
        await wipeAllData();
        // K1: see AjustesClient.handleWipe — a stale draft would resume
        // onboarding into a state that never writes a profile row.
        clearOnboardingDraft();
        clearPin();
      } catch {
        // A browser that refuses to drop IndexedDB must not block the server
        // deletion — that is the half the user cannot do themselves.
      }
    }

    setWiping(false);
    preparedRef.current = true;
    form.requestSubmit();
  }

  return (
    <section className="rounded-card border border-terracotta/30 bg-terracotta/5 p-4">
      <h2 className="text-base font-extrabold text-terracotta">
        Borrar mi cuenta
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Borramos del servidor todo lo tuyo: tus registros sincronizados, tu
        embarazo, las personas invitadas, las notificaciones y las imágenes
        generadas. No queda una copia nuestra y no se puede deshacer.
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
          action={formAction}
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
              que nunca salieron de acá).
            </span>
          </label>

          <p className="text-sm font-extrabold text-ink">
            ¿Seguro? Esta acción es definitiva.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending || wiping}
              className="min-h-[44px] flex-1 rounded-tile bg-terracotta px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {pending || wiping ? "Borrando…" : "Sí, borrar mi cuenta"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending || wiping}
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
