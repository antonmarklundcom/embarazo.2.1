"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useProfile } from "@/lib/useProfile";
import {
  DUE_DATE_METHOD_LABELS,
  DEFAULT_PREGNANCY_SETTINGS,
  dueDateFrom,
  formatGestationLength,
  isValidGestationDays,
  MAX_GESTATION_DAYS,
  MIN_GESTATION_DAYS,
  type WeekDisplay,
} from "@/lib/dueDate";
import { formatCompletedGestation, getCompletedGestation } from "@/lib/pregnancy";

// BUILD-PLAN B3 (FEATURE-MAP #5, #6). The settings half of the due-date work:
// gestation length, week notation, and a planned delivery date separate from
// the estimate.
//
// Changing the gestation length moves the due date but NOT the LMP — the LMP is
// a fact about the pregnancy, the length is an expectation about it. Keeping
// them separate is what stops a settings tweak from silently rewriting the
// user's week.

function toDateInput(ms: number | undefined): string {
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

export function PregnancySettingsCard() {
  const profile = useProfile();
  const [gestationDays, setGestationDays] = useState("");
  const [weekDisplay, setWeekDisplay] = useState<WeekDisplay>("weekDay");
  const [plannedDelivery, setPlannedDelivery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile.hasPregnancy) return;
    setGestationDays(String(profile.gestationDays));
    setWeekDisplay(profile.weekDisplay);
    setPlannedDelivery(toDateInput(profile.plannedDeliveryDate));
  }, [
    profile.hasPregnancy,
    profile.gestationDays,
    profile.weekDisplay,
    profile.plannedDeliveryDate,
  ]);

  if (!profile.hasPregnancy || profile.lmpDate === undefined) return null;

  const lmpDate = profile.lmpDate;
  const parsedDays = Number(gestationDays);
  const daysValid = isValidGestationDays(parsedDays);
  const previewDue = daysValid
    ? dueDateFrom(lmpDate, { gestationDays: parsedDays })
    : undefined;
  const completed = getCompletedGestation(lmpDate);

  async function save() {
    setMessage("");
    setError("");
    if (!daysValid) {
      setError(
        `La duración tiene que estar entre ${MIN_GESTATION_DAYS} y ${MAX_GESTATION_DAYS} días (${formatGestationLength(
          MIN_GESTATION_DAYS,
        )} a ${formatGestationLength(MAX_GESTATION_DAYS)}).`,
      );
      return;
    }

    const planned = plannedDelivery
      ? new Date(`${plannedDelivery}T00:00:00`).getTime()
      : undefined;
    if (planned !== undefined && Number.isNaN(planned)) {
      setError("Elegí una fecha válida para el parto programado.");
      return;
    }

    try {
      const rows = await db().pregnancy.toArray();
      const row = rows[0];
      if (!row?.id) return;
      await db().pregnancy.update(row.id, {
        gestationDays: parsedDays,
        weekDisplay,
        plannedDeliveryDate: planned,
        // The LMP is untouched: only the expected length changes, so the due
        // date moves and the current week does not.
        dueDate: dueDateFrom(row.lmpDate, { gestationDays: parsedDays }),
      });
      setMessage("Guardado.");
    } catch {
      setError("No pudimos guardar los cambios en este dispositivo.");
    }
  }

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <h2 className="text-base font-extrabold text-ink">Tu embarazo</h2>
      {profile.dueDateMethod && (
        <p className="mt-1 text-xs text-muted">
          Calculado con: {DUE_DATE_METHOD_LABELS[profile.dueDateMethod]}.
        </p>
      )}

      <label
        htmlFor="weekDisplay"
        className="mt-4 block text-sm font-extrabold text-ink"
      >
        Cómo mostrar tu semana
      </label>
      <p className="mt-1 text-xs text-muted">
        &ldquo;{formatCompletedGestation(completed)}&rdquo; se escribe{" "}
        <strong>
          {completed.weeks}+{completed.days}
        </strong>{" "}
        en tu carné.
      </p>
      <select
        id="weekDisplay"
        value={weekDisplay}
        onChange={(e) => setWeekDisplay(e.target.value as WeekDisplay)}
        className="mt-2 min-h-[44px] w-full rounded-tile border border-line bg-cream px-3 text-sm text-ink focus:border-petrol focus:outline-none"
      >
        <option value="weekDay">
          Como el carné ({completed.weeks}+{completed.days})
        </option>
        <option value="week">Solo la semana ({completed.weeks + 1})</option>
      </select>

      <label
        htmlFor="gestationDays"
        className="mt-4 block text-sm font-extrabold text-ink"
      >
        Duración del embarazo
      </label>
      <p className="mt-1 text-xs text-muted">
        Lo normal es {DEFAULT_PREGNANCY_SETTINGS.gestationDays} días (
        {formatGestationLength(DEFAULT_PREGNANCY_SETTINGS.gestationDays)}).
        Cambialo solo si tu médico/a te dio otra.
      </p>
      <input
        id="gestationDays"
        type="number"
        inputMode="numeric"
        min={MIN_GESTATION_DAYS}
        max={MAX_GESTATION_DAYS}
        value={gestationDays}
        onChange={(e) => setGestationDays(e.target.value)}
        className="mt-2 min-h-[44px] w-full rounded-tile border border-line bg-cream px-3 text-ink focus:border-petrol focus:outline-none"
      />
      {previewDue && (
        <p className="mt-1 text-xs text-muted">
          Fecha probable de parto:{" "}
          <strong className="text-ink">
            {new Date(previewDue).toLocaleDateString("es-PY", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </strong>
        </p>
      )}

      <label
        htmlFor="plannedDelivery"
        className="mt-4 block text-sm font-extrabold text-ink"
      >
        Parto programado{" "}
        <span className="font-normal text-muted">(opcional)</span>
      </label>
      <p className="mt-1 text-xs text-muted">
        Si ya tenés fecha para una cesárea o una inducción, poné esa acá. No
        cambia el cálculo de tu semana.
      </p>
      <input
        id="plannedDelivery"
        type="date"
        value={plannedDelivery}
        onChange={(e) => setPlannedDelivery(e.target.value)}
        className="mt-2 min-h-[44px] w-full rounded-tile border border-line bg-cream px-3 text-ink focus:border-petrol focus:outline-none"
      />

      <button
        type="button"
        onClick={save}
        className="mt-4 min-h-[44px] w-full rounded-tile bg-petrol px-4 text-sm font-medium text-white transition active:scale-[0.98]"
      >
        Guardar
      </button>

      {message && <p className="mt-2 text-sm text-sage">{message}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-terracotta">
          {error}
        </p>
      )}
    </section>
  );
}
