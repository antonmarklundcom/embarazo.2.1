"use client";

import { useEffect, useState } from "react";

import { type AppMode } from "@/lib/db";
import { toDateInput } from "@/lib/appointments";
import {
  birthDateBounds,
  canUndoBirth,
  isValidBirthDate,
  parseDateInput,
} from "@/lib/baby/age";
import { clearBirth, recordBirth } from "@/lib/baby/record";

// Birth entry also lives here for premature deliveries: the automatic Hoy
// card waits until week 37, but a mother whose baby was born earlier needs
// the same supported date range and postpartum home immediately.
export function BirthSettings({
  mode,
  lmpDate,
  birthDate,
  birthRecordedAt,
}: {
  mode: AppMode;
  lmpDate: number | undefined;
  birthDate: number | undefined;
  birthRecordedAt: number | undefined;
}) {
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");
  const [warn, setWarn] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(toDateInput(birthDate ?? Date.now()));
  }, [birthDate]);

  if (mode !== "embarazada" || lmpDate === undefined) return null;

  const { min, max } = birthDateBounds(lmpDate);
  if (birthDate === undefined && min > max) return null;

  async function save() {
    setMsg("");
    setWarn("");
    const date = parseDateInput(value);
    if (!isValidBirthDate(date, lmpDate!)) {
      setWarn("Elegí una fecha entre la semana 22 del embarazo y hoy.");
      return;
    }
    setBusy(true);
    try {
      if (!(await recordBirth(date))) {
        setWarn("No pudimos guardar la fecha. Revisá la fecha de tu embarazo y probá de nuevo.");
        return;
      }
      setRecording(false);
      setMsg("Fecha de nacimiento guardada.");
      setTimeout(() => setMsg(""), 2500);
    } catch {
      setWarn("No pudimos guardar la fecha. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    setBusy(true);
    setWarn("");
    try {
      await clearBirth();
      setRecording(false);
      setMsg("");
    } catch {
      setWarn("No pudimos deshacer el cambio. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  if (birthDate === undefined && !recording) {
    return (
      <section aria-label="Fecha de nacimiento" className="rounded-card bg-white p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">¿Tu bebé ya nació?</h2>
        <p className="mt-1 text-sm text-muted">
          También podés registrar un nacimiento antes de término. La app cambia al acompañamiento
          de tu bebé y conserva tus registros del embarazo.
        </p>
        <button type="button" onClick={() => setRecording(true)}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white">
          Registrar el nacimiento
        </button>
        {warn && <p role="alert" className="mt-2 text-sm text-terracotta">{warn}</p>}
      </section>
    );
  }

  return (
    <section aria-label="Fecha de nacimiento" className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">Fecha de nacimiento</h2>
      <p className="mt-1 text-sm text-muted">
        {birthDate === undefined ? "Elegí el día que nació tu bebé. Al guardar, Hoy muestra su edad y sus cuidados." : "El día que nació tu bebé. Podés corregirla."}
      </p>
      <input
        type="date"
        aria-label="Fecha de nacimiento"
        value={value}
        min={toDateInput(min)}
        max={toDateInput(max)}
        onChange={(e) => setValue(e.target.value)}
        className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
      />
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        Guardar fecha de nacimiento
      </button>
      {birthDate === undefined && (
        <button type="button" onClick={() => setRecording(false)} disabled={busy}
          className="mt-2 min-h-[44px] w-full rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol">
          Cancelar
        </button>
      )}
      {warn && (
        <p role="alert" className="mt-2 text-sm font-semibold text-terracotta">
          {warn}
        </p>
      )}
      {msg && <p className="mt-2 text-sm text-sage">{msg}</p>}
      {canUndoBirth(birthRecordedAt) && (
        <>
          <p className="mt-4 text-sm text-muted">
            ¿Lo marcaste sin querer? Volvé al embarazo: no se borra nada de lo que guardaste.
          </p>
          <button
            type="button"
            onClick={undo}
            disabled={busy}
            className="mt-2 min-h-[44px] w-full rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol disabled:opacity-60"
          >
            Deshacer «Ya nació»
          </button>
        </>
      )}
    </section>
  );
}
