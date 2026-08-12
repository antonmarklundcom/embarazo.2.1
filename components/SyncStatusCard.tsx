"use client";

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

export function SyncStatusCard() {
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

  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-soft">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Copia en tu cuenta
      </p>
      <h2 className="mt-1 text-[15px] font-extrabold text-ink">
        {pending && pending > 0
          ? "Subiendo tus datos…"
          : "Tus datos están guardados"}
      </h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-muted">
        {pending && pending > 0
          ? "Falta subir algo. Se completa solo cuando tengas señal."
          : state.lastSyncAt
            ? `Última sincronización: ${formatWhen(state.lastSyncAt)}.`
            : "Listo."}{" "}
        Tus fotos no se suben: siguen solo en este teléfono.
      </p>
    </section>
  );
}
