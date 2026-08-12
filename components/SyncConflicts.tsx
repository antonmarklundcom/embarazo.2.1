"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/lib/db";
import { discardConflict, restoreConflict } from "@/lib/sync/client";

// BUILD-PLAN A3. "Journal-note conflicts are kept as a `conflicts` row and
// surfaced, never silently dropped" — this is the surfacing half. Without a
// screen, the row is just a quieter way of losing the note.
//
// It renders nothing at all when there is nothing to say, which is the normal
// case: a user with one device never sees this.

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString("es-PY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SyncConflicts() {
  const conflicts = useLiveQuery(
    () => db().conflicts.where("resolved").equals(0).toArray(),
    [],
  );

  if (!conflicts || conflicts.length === 0) return null;

  return (
    <section className="rounded-card border border-terracotta/30 bg-white p-4 shadow-soft">
      <h2 className="text-sm font-extrabold text-ink">
        Una nota tuya fue reemplazada
      </h2>
      <p className="mt-1 text-xs text-muted">
        Se guardó una versión más nueva desde otro dispositivo. Guardamos lo que
        habías escrito acá para que decidas vos.
      </p>

      <ul className="mt-3 space-y-3">
        {conflicts.map((conflict) => {
          const note =
            typeof conflict.localPayload?.note === "string"
              ? conflict.localPayload.note
              : "";
          return (
            <li
              key={conflict.id}
              className="rounded-tile border border-black/10 bg-cream p-3"
            >
              <p className="text-[11px] text-muted">
                Tu versión del {formatDate(conflict.localUpdatedAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                {note || "(sin texto)"}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void restoreConflict(conflict.id!)}
                  className="min-h-[44px] flex-1 rounded-tile bg-petrol px-3 text-sm font-extrabold text-white"
                >
                  Recuperar la mía
                </button>
                <button
                  type="button"
                  onClick={() => void discardConflict(conflict.id!)}
                  className="min-h-[44px] flex-1 rounded-tile border border-black/10 px-3 text-sm font-extrabold text-ink"
                >
                  Dejar la nueva
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
