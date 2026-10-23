import { useEffect, useRef, useState } from "react";

import { db, notDeleted, type AppMode } from "@/lib/db";
import { toDateInput } from "@/lib/appointments";
import { getDueDate, GESTATION_DAYS } from "@/lib/pregnancy";

// W4: "Duración del embarazo" + "Fecha de parto planificada" (B3), moved
// verbatim out of AjustesClient. They were one <section> there and stay one
// here, with the two drafts, the two seeding effects and the two writers that
// only this card uses. Gate inside — see PregnancyDateSettings.
export function GestationSettings({
  mode,
  gestationDays,
  plannedDeliveryDate,
}: {
  mode: AppMode;
  gestationDays: number | undefined;
  plannedDeliveryDate: number | undefined;
}) {
  // Adjustable pregnancy length + planned delivery date (B3).
  const [gestationInput, setGestationInput] = useState(() => String(gestationDays ?? GESTATION_DAYS));
  const [gestationMsg, setGestationMsg] = useState("");
  const [plannedInput, setPlannedInput] = useState(() => toDateInput(plannedDeliveryDate));
  const [plannedMsg, setPlannedMsg] = useState("");

  // A delayed live-profile refresh must not replace a newer unsaved draft.
  const gestationDraft = useRef({ dirty: false, version: 0 });
  const plannedDraft = useRef({ dirty: false, version: 0 });
  useEffect(() => {
    if (!gestationDraft.current.dirty) setGestationInput(String(gestationDays ?? GESTATION_DAYS));
  }, [gestationDays]);

  useEffect(() => {
    if (!plannedDraft.current.dirty) setPlannedInput(toDateInput(plannedDeliveryDate));
  }, [plannedDeliveryDate]);

  async function saveGestationLength() {
    setGestationMsg("");
    const days = Number(gestationInput);
    if (!Number.isFinite(days) || days < 140 || days > 320) {
      setGestationMsg("Ingresá una duración válida (entre 140 y 320 días).");
      return;
    }
    const submittedVersion = gestationDraft.current.version;
    const rows = notDeleted(await db().pregnancy.toArray());
    const first = rows[0];
    if (!first?.id) return;
    await db().pregnancy.update(first.id, {
      gestationDays: days,
      dueDate: getDueDate(first.lmpDate, days),
    });
    if (gestationDraft.current.version === submittedVersion) gestationDraft.current.dirty = false;
    setGestationMsg("Duración actualizada. Tu fecha probable de parto se recalculó.");
    setTimeout(() => setGestationMsg(""), 3500);
  }

  async function savePlannedDeliveryDate() {
    const submittedVersion = plannedDraft.current.version;
    const rows = notDeleted(await db().pregnancy.toArray());
    const first = rows[0];
    if (!first?.id) return;
    const value = plannedInput
      ? new Date(`${plannedInput}T00:00:00`).getTime()
      : undefined;
    await db().pregnancy.update(first.id, { plannedDeliveryDate: value });
    if (plannedDraft.current.version === submittedVersion) plannedDraft.current.dirty = false;
    setPlannedMsg(value ? "Fecha planificada guardada." : "Fecha planificada quitada.");
    setTimeout(() => setPlannedMsg(""), 2500);
  }

  if (mode !== "embarazada") return null;

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">Duración del embarazo</h2>
      <p className="mt-1 text-sm text-muted">
        Por defecto usamos 280 días (40 semanas). Ajustala si tu médico/a te
        indicó una duración distinta.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          aria-label="Duración del embarazo, en días"
          inputMode="numeric"
          min={140}
          max={320}
          value={gestationInput}
          onChange={(e) => { gestationDraft.current.dirty = true; gestationDraft.current.version++; setGestationInput(e.target.value); }}
          className="min-h-[44px] w-24 rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
        />
        <span className="text-sm text-muted">días</span>
      </div>
      <button
        type="button"
        onClick={saveGestationLength}
        className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
      >
        Guardar duración
      </button>
      {gestationMsg && <p className="mt-2 text-sm text-sage">{gestationMsg}</p>}

      <h2 className="mt-5 text-base font-extrabold text-ink">
        Fecha de parto planificada
      </h2>
      <p className="mt-1 text-sm text-muted">
        Si tenés una cesárea programada u otra fecha planificada, distinta a
        la fecha probable de parto estimada.
      </p>
      <input
        type="date"
        aria-label="Fecha de parto planificada"
        value={plannedInput}
        onChange={(e) => { plannedDraft.current.dirty = true; plannedDraft.current.version++; setPlannedInput(e.target.value); }}
        className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
      />
      <button
        type="button"
        onClick={savePlannedDeliveryDate}
        className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
      >
        Guardar fecha planificada
      </button>
      {plannedMsg && <p className="mt-2 text-sm text-sage">{plannedMsg}</p>}
    </section>
  );
}
