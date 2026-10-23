"use client";

import { useSyncExternalStore } from "react";
import { isSyncRunning, subscribeSyncActivity, retrySyncNow } from "@/lib/sync/client";
import { syncStatusView } from "@/lib/sync/status";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import { ACCOUNT_MISMATCH_MESSAGE } from "@/lib/sync/link";
import { SYNCED_STORES } from "@/lib/sync/stores";

// BUILD-PLAN A6 — what happened to my data when I signed in?
//
// Uploading a user's pregnancy silently is not the same as uploading it
// well: "did my stuff make it?" is the first question anyone asks after
// linking an account, and a spinner-free app that answers it nowhere reads as
// an app that lost the data. This card answers it from `syncState`, which the
// engine already maintains — no extra requests, no extra state.
//
// It renders nothing when there is nothing to report, so a local-only user
// (the common case) never sees it.

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString("es-PY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function subscribeConnection(listener: () => void): () => void {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => { window.removeEventListener("online", listener); window.removeEventListener("offline", listener); };
}
function isOffline(): boolean { return navigator.onLine === false; }

export function SyncStatusCard() {
  const offline = useSyncExternalStore(subscribeConnection, isOffline, () => false);
  const running = useSyncExternalStore(subscribeSyncActivity, isSyncRunning, () => false);
  const state = useLiveQuery(() => db().syncState.get("default"), []);
  const pending = useLiveQuery(async () => {
    // Cheap: `dirty` is indexed on every synced store (A3).
    const counts = await Promise.all(
      SYNCED_STORES.map((store) =>
        db().table(store).where("dirty").equals(1).count(),
      ),
    );
    return counts.reduce((a, b) => a + b, 0);
  }, []);

  if (!state) return null;

  // The account-mismatch guard (lib/sync/link.ts). This is the one state the
  // user has to act on, so it looks different from the rest — and it is
  // matched on the exact message the guard writes, not on a heuristic.
  if (state.lastError === ACCOUNT_MISMATCH_MESSAGE) {
    return (
      <section className="rounded-card border border-terracotta/30 bg-terracotta/5 p-4">
        <h2 className="text-[15px] font-extrabold text-terracotta">
          No sincronizamos los datos de este teléfono
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink">
          {state.lastError}
        </p>
      </section>
    );
  }

  // Never linked to an account: there is no copy to report on, and saying so
  // would just add noise to a local-only user's settings screen.
  if (!state.accountId) return null;

  const view = syncStatusView({ running, offline, pending, lastError: state.lastError, lastSyncAt: state.lastSyncAt });
  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-soft" aria-label="Estado de la copia en tu cuenta">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Copia en tu cuenta
      </p>
      <h2 className="mt-1 text-[15px] font-extrabold text-ink">
        {view.title}
      </h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-muted">
        {view.description}{" "}
        {state.lastSyncAt ? `Última conexión completada: ${formatWhen(state.lastSyncAt)}. ` : ""}
        {/* K4 amended §4.4: photo backup is an opt-in, so this line stopped
            being unconditionally true. It now says what is true either way —
            the sync engine never carries a photo — and points at the one
            switch that does. */}
        Tus fotos no viajan con esta sincronización. Si querés una copia de
        ellas, activá «Copia de tus fotos» en Ajustes.
      </p>
      {view.retry && <button type="button" className="mt-3 min-h-11 rounded-tile border border-line px-4 text-sm font-bold text-petrol" onClick={() => { void retrySyncNow(); }}>Volver a intentar</button>}
      <p role="status" aria-live="polite" className="sr-only">{view.title}. {view.description}</p>
    </section>
  );
}
