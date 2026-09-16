import { useState } from "react";

import { db, type AppMode } from "@/lib/db";

// W4: "Modo de uso" (build spec §3), moved verbatim out of AjustesClient with
// the one piece of state and the one writer that only this card uses.
// Switching never deletes data.
//
// No client directive here, and none in any of this folder's siblings: the
// boundary is still `app/(app)/ajustes/AjustesClient.tsx`, the only file on
// this route that declares one, and everything it imports is pulled into the
// client graph behind it. A second directive would not move the boundary, but
// it would blur where it is.
export function ModeSettings({
  mode,
  hasPregnancy,
}: {
  mode: AppMode;
  hasPregnancy: boolean;
}) {
  const [modeMsg, setModeMsg] = useState("");

  async function switchMode(next: AppMode) {
    if (next === mode) return;
    const rows = await db().profile.toArray();
    const first = rows[0];
    if (!first?.id) return;
    await db().profile.update(first.id, { mode: next });
    setModeMsg(
      next === "planeando"
        ? "Estás en modo Planeando. Tus datos se conservan."
        : "Estás en modo Embarazada. Tus datos se conservan.",
    );
    setTimeout(() => setModeMsg(""), 3500);
  }

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">Modo de uso</h2>
      <p className="mt-1 text-sm text-muted">
        Cambiá entre seguir tu embarazo o planear/buscar embarazo. Cambiar de
        modo no borra ninguno de tus datos.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => switchMode("embarazada")}
          aria-pressed={mode === "embarazada"}
          className={`min-h-[44px] rounded-tile border px-3 py-2.5 text-sm font-medium transition ${
            mode === "embarazada"
              ? "border-petrol bg-petrol text-white"
              : "border-black/10 bg-cream text-ink"
          }`}
        >
          Estoy embarazada
        </button>
        <button
          type="button"
          onClick={() => switchMode("planeando")}
          aria-pressed={mode === "planeando"}
          className={`min-h-[44px] rounded-tile border px-3 py-2.5 text-sm font-medium transition ${
            mode === "planeando"
              ? "border-petrol bg-petrol text-white"
              : "border-black/10 bg-cream text-ink"
          }`}
        >
          Planeando / buscando
        </button>
      </div>
      {mode === "embarazada" && !hasPregnancy && (
        <p className="mt-2 text-sm text-terracotta">
          Para seguir tu embarazo, cargá tu fecha más abajo.
        </p>
      )}
      {modeMsg && <p className="mt-2 text-sm text-sage">{modeMsg}</p>}
    </section>
  );
}
