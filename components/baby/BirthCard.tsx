"use client";

import { useState } from "react";

import { toDateInput } from "@/lib/appointments";
import {
  babyAge,
  babyAgeLabel,
  birthDateBounds,
  isValidBirthDate,
  offersBirthCard,
  parseDateInput,
} from "@/lib/baby/age";
import { recordBirth } from "@/lib/baby/record";

// Growth plan item 9 ("Ya nació", G1) — the quiet question on Hoy from week 37.
//
// Nothing changes until she taps "Sí, ya nació" and saves a date: no prompt,
// no guess from the due date. The date defaults to today and can be set back
// (never into the future, never before week 22). Once saved, the card turns
// into a one-line confirmation; changing the date or undoing it lives in
// Ajustes, so a stray tap on Hoy cannot undo anything.

export function BirthCard({
  week,
  lmpDate,
  birthDate,
}: {
  week: number;
  lmpDate: number;
  birthDate: number | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(() => toDateInput(Date.now()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (birthDate !== undefined) {
    const born = new Date(birthDate).toLocaleDateString("es-PY", { day: "numeric", month: "long" });
    return (
      <section aria-label="Tu bebé ya nació" className="rounded-card bg-pastel-rosa p-4 shadow-soft">
        <p className="text-base font-extrabold text-ink">¡Felicidades! Tu bebé nació el {born}.</p>
        <p className="mt-1 text-sm text-muted">
          Hoy tiene {babyAgeLabel(babyAge(birthDate))}. Si la fecha no es esa, cambiala en Ajustes.
        </p>
      </section>
    );
  }

  if (!offersBirthCard(week, birthDate)) return null;

  const { min, max } = birthDateBounds(lmpDate);

  async function save() {
    setError("");
    const date = parseDateInput(value);
    if (!isValidBirthDate(date, lmpDate)) {
      setError("Elegí una fecha entre la semana 22 del embarazo y hoy.");
      return;
    }
    setBusy(true);
    const ok = await recordBirth(date);
    setBusy(false);
    if (!ok) setError("No pudimos guardar la fecha. Probá de nuevo.");
  }

  return (
    <section aria-label="¿Ya nació tu bebé?" className="rounded-card bg-white p-4 shadow-soft">
      <p className="text-base font-extrabold text-ink">¿Ya nació tu bebé?</p>
      {!open ? (
        <>
          <p className="mt-1 text-sm text-muted">
            Cuando nazca, contanos la fecha y la app te acompaña en los primeros meses.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
          >
            Sí, ya nació
          </button>
        </>
      ) : (
        <>
          <label htmlFor="birth-date" className="mt-2 block text-sm text-muted">
            ¿Qué día nació?
          </label>
          <input
            id="birth-date"
            type="date"
            value={value}
            min={toDateInput(min)}
            max={toDateInput(max)}
            onChange={(e) => setValue(e.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError("");
              }}
              className="min-h-[44px] flex-1 rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
            >
              Todavía no
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="min-h-[44px] flex-1 rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              Guardar la fecha
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-terracotta">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
