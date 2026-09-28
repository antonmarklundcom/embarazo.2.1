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

// Growth plan item 9 ("Ya nació", G1) — the birth date, once recorded on Hoy.
//
// Renders nothing until then: the question itself belongs to Hoy (from week
// 37), and a birth-date field in Ajustes during the pregnancy would be a
// question she is not ready to answer. The date can always be corrected;
// "Deshacer" (for a mistaken tap) lasts 30 days from the first "Sí".
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

  useEffect(() => {
    setValue(toDateInput(birthDate));
  }, [birthDate]);

  if (mode !== "embarazada" || birthDate === undefined || lmpDate === undefined) return null;

  const { min, max } = birthDateBounds(lmpDate);

  async function save() {
    setMsg("");
    setWarn("");
    const date = parseDateInput(value);
    if (!isValidBirthDate(date, lmpDate!)) {
      setWarn("Elegí una fecha entre la semana 22 del embarazo y hoy.");
      return;
    }
    await recordBirth(date);
    setMsg("Fecha de nacimiento guardada.");
    setTimeout(() => setMsg(""), 2500);
  }

  async function undo() {
    await clearBirth();
  }

  return (
    <section aria-label="Fecha de nacimiento" className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">Fecha de nacimiento</h2>
      <p className="mt-1 text-sm text-muted">El día que nació tu bebé. Podés corregirla.</p>
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
        className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
      >
        Guardar fecha de nacimiento
      </button>
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
            className="mt-2 min-h-[44px] w-full rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
          >
            Deshacer «Ya nació»
          </button>
        </>
      )}
    </section>
  );
}
