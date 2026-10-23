import { useEffect, useRef, useState } from "react";

import { db, notDeleted, type AppMode } from "@/lib/db";
import { toDateInput } from "@/lib/appointments";
import {
  getDueDate,
  lmpFromDueDate,
  getRawWeek,
  GESTATION_DAYS,
  MAX_WEEK,
} from "@/lib/pregnancy";

// W4: "Editar fecha de embarazo" (build spec §1), moved verbatim out of
// AjustesClient with its five pieces of draft state, the effect that seeds them
// from the profile, and its writer.
//
// The pregnancy-mode gate is inside rather than at the call site, so a user who
// types a date, switches to "planeando" and switches back still finds what she
// typed — exactly as when these were `useState` in AjustesClient and only the
// JSX was conditional.
export function PregnancyDateSettings({
  mode,
  lmpDate,
  dueDate,
  gestationDays = GESTATION_DAYS,
  today,
}: {
  mode: AppMode;
  lmpDate: number | undefined;
  dueDate: number | undefined;
  gestationDays?: number;
  today: string;
}) {
  // Editable pregnancy date (build spec §1).
  const [useDueDate, setUseDueDate] = useState(false);
  const [lmpInput, setLmpInput] = useState(() => toDateInput(lmpDate));
  const [dueInput, setDueInput] = useState(() => toDateInput(dueDate));
  const [dateMsg, setDateMsg] = useState("");
  const [dateWarn, setDateWarn] = useState("");

  const lmpDraft = useRef({ dirty: false, version: 0 });
  const dueDraft = useRef({ dirty: false, version: 0 });
  useEffect(() => {
    if (!lmpDraft.current.dirty) setLmpInput(toDateInput(lmpDate));
  }, [lmpDate]);
  useEffect(() => {
    if (!dueDraft.current.dirty) setDueInput(toDateInput(dueDate));
  }, [dueDate]);

  async function savePregnancyDate() {
    setDateMsg("");
    setDateWarn("");
    const submittedDraft = useDueDate ? dueDraft : lmpDraft;
    const submittedVersion = submittedDraft.current.version;
    // Read the latest duration, including an edit/sync from another tab that
    // arrived after this form rendered. Never resurrect a tombstoned row.
    const first = notDeleted(await db().pregnancy.toArray())[0];
    const duration = first?.gestationDays ?? gestationDays;
    const nextLmpDate = useDueDate
      ? dueInput
        ? lmpFromDueDate(new Date(`${dueInput}T00:00:00`).getTime(), duration)
        : NaN
      : lmpInput
        ? new Date(`${lmpInput}T00:00:00`).getTime()
        : NaN;

    if (Number.isNaN(nextLmpDate)) {
      setDateWarn("Elegí una fecha válida.");
      return;
    }
    if (nextLmpDate > Date.now()) {
      setDateWarn("La fecha de tu última regla no puede estar en el futuro.");
      return;
    }

    // If the date implies more than 42 weeks, warn but still allow saving.
    if (getRawWeek(nextLmpDate) > MAX_WEEK) {
      setDateWarn(
        "Según esta fecha, tu embarazo ya habría llegado a término. Revisá la fecha.",
      );
    }

    // An explicit new FUM/FPP supersedes the previous FIV/conception method;
    // preserve the custom duration and every unrelated pregnancy field.
    const patch = {
      lmpDate: nextLmpDate,
      dueDate: getDueDate(nextLmpDate, duration),
      method: useDueDate ? "ecografia" as const : "lmp" as const,
    };
    if (first?.id) {
      await db().pregnancy.update(first.id, patch);
    } else {
      await db().pregnancy.add({
        ...patch,
        gestationDays: duration,
        createdAt: Date.now(),
      });
    }
    if (submittedDraft.current.version === submittedVersion) submittedDraft.current.dirty = false;
    setDateMsg("Fecha actualizada. Tu semana se recalculó.");
    setTimeout(() => setDateMsg(""), 3000);
  }

  if (mode !== "embarazada") return null;

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">
        Editar fecha de embarazo
      </h2>
      <p className="mt-1 text-sm text-muted">
        Si te equivocaste o te corrigieron la fecha, actualizala acá. Tu
        semana y trimestre se recalculan en toda la app.
      </p>

      <label className="mt-3 flex items-start gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={useDueDate}
          onChange={(e) => setUseDueDate(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-black/20 accent-petrol"
        />
        <span>No sé mi última regla — usar fecha probable de parto</span>
      </label>

      {!useDueDate ? (
        <div className="mt-3">
          <label htmlFor="lmp-edit" className="block text-xs text-muted">
            Primer día de tu última menstruación
          </label>
          <input
            id="lmp-edit"
            type="date"
            value={lmpInput}
            max={today}
            onChange={(e) => { lmpDraft.current.dirty = true; lmpDraft.current.version++; setLmpInput(e.target.value); }}
            className="mt-1 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
          />
        </div>
      ) : (
        <div className="mt-3">
          <label htmlFor="due-edit" className="block text-xs text-muted">
            Fecha probable de parto
          </label>
          <input
            id="due-edit"
            type="date"
            value={dueInput}
            onChange={(e) => { dueDraft.current.dirty = true; dueDraft.current.version++; setDueInput(e.target.value); }}
            className="mt-1 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-muted">
            Calculamos tu última regla restando {gestationDays} días a esta fecha.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={savePregnancyDate}
        className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
      >
        Guardar fecha
      </button>
      {dateWarn && <p className="mt-2 text-sm text-terracotta">{dateWarn}</p>}
      {dateMsg && <p className="mt-2 text-sm text-sage">{dateMsg}</p>}
    </section>
  );
}
