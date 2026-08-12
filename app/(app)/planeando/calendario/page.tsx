"use client";

import { useState } from "react";
import Link from "next/link";
import { db, softDelete } from "@/lib/db";
import { useCycles } from "@/lib/useCycles";
import { cycleDay, daysUntil } from "@/lib/cycle";
import { PrivacyLine } from "@/components/PrivacyLine";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CalendarioPage() {
  const cycles = useCycles();
  const today = new Date().toISOString().slice(0, 10);
  const [startInput, setStartInput] = useState(today);
  const [savedMsg, setSavedMsg] = useState("");

  // Cycle settings editing.
  const [editing, setEditing] = useState(false);
  const [cycleLen, setCycleLen] = useState("");
  const [periodLen, setPeriodLen] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");

  async function addPeriod() {
    if (!startInput) return;
    const startDate = new Date(`${startInput}T00:00:00`).getTime();
    if (startDate > Date.now()) return;
    await db().cycles.add({ startDate, createdAt: Date.now() });
    setSavedMsg("Regla registrada.");
    setTimeout(() => setSavedMsg(""), 2500);
  }

  async function remove(id?: number) {
    // Soft delete: the row is tombstoned so the deletion reaches the
    // user's other devices instead of being undone by the next pull.
    if (id) await softDelete("cycles", id);
  }

  function startEditing() {
    setCycleLen(String(cycles.settingCycleLength));
    setPeriodLen(String(cycles.settingPeriodLength));
    setEditing(true);
  }

  async function saveSettings() {
    const c = Math.round(Number(cycleLen));
    const p = Math.round(Number(periodLen));
    if (!c || c < 20 || c > 60 || !p || p < 1 || p > 14) {
      setSettingsMsg("Revisá los valores (ciclo 20–60, regla 1–14).");
      return;
    }
    const existing = (await db().cycleSettings.toArray())[0];
    if (existing?.id) {
      await db().cycleSettings.update(existing.id, {
        avgCycleLength: c,
        avgPeriodLength: p,
      });
    } else {
      await db().cycleSettings.add({ avgCycleLength: c, avgPeriodLength: p });
    }
    setEditing(false);
    setSettingsMsg("Promedios actualizados.");
    setTimeout(() => setSettingsMsg(""), 2500);
  }

  const ordered = [...cycles.cycles].reverse(); // newest first for the list
  const predicted = cycles.predictedNextStart;
  const daysToNext = predicted !== undefined ? daysUntil(predicted) : null;
  const dayInCycle =
    cycles.lastStart !== undefined ? cycleDay(cycles.lastStart) : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Calendario menstrual
        </h1>
        <p className="text-sm text-muted">
          Registrá el primer día de cada regla. Todo queda solo en tu teléfono.
        </p>
      </header>

      {/* Log a period */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <label htmlFor="start" className="block text-xs text-muted">
          Primer día de tu última regla
        </label>
        <input
          id="start"
          type="date"
          value={startInput}
          max={today}
          onChange={(e) => setStartInput(e.target.value)}
          className="mt-1 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
        />
        <button
          type="button"
          onClick={addPeriod}
          className="mt-3 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Registrar regla
        </button>
        {savedMsg && <p className="mt-2 text-sm text-sage">{savedMsg}</p>}
      </section>

      {/* Prediction */}
      {predicted !== undefined && (
        <section className="rounded-card border border-sage/30 bg-sage/5 p-4">
          <h2 className="text-sm font-extrabold text-ink">
            Próxima regla estimada
          </h2>
          <p className="mt-1 text-base font-extrabold text-ink">
            {fmtDate(predicted)}
            {daysToNext !== null && daysToNext >= 0
              ? ` · en ${daysToNext} ${daysToNext === 1 ? "día" : "días"}`
              : ""}
          </p>
          {dayInCycle !== null && (
            <p className="mt-1 text-xs text-muted">
              Hoy es el día {dayInCycle} de tu ciclo. Ciclo promedio estimado:{" "}
              {cycles.effectiveCycleLength} días
              {cycles.observedCycleLength
                ? " (según tu historial)."
                : " (valor por defecto, registrá más reglas para afinarlo)."}
            </p>
          )}
          <Link
            href="/planeando/fertilidad"
            className="mt-2 inline-block text-sm font-medium text-petrol underline"
          >
            Ver mis días fértiles estimados →
          </Link>
        </section>
      )}

      {/* Settings */}
      <section className="rounded-card bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-ink">Tus promedios</h2>
          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              className="text-xs text-petrol underline"
            >
              Editar
            </button>
          )}
        </div>
        {!editing ? (
          <p className="mt-1 text-sm text-muted">
            Ciclo: {cycles.settingCycleLength} días · Regla:{" "}
            {cycles.settingPeriodLength} días. Si registrás varias reglas,
            usamos tu promedio real para predecir.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="clen" className="block text-xs text-muted">
                  Días de ciclo
                </label>
                <input
                  id="clen"
                  inputMode="numeric"
                  value={cycleLen}
                  onChange={(e) => setCycleLen(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="plen" className="block text-xs text-muted">
                  Días de regla
                </label>
                <input
                  id="plen"
                  inputMode="numeric"
                  value={periodLen}
                  onChange={(e) => setPeriodLen(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 focus:border-petrol focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveSettings}
                className="min-h-[44px] flex-1 rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="min-h-[44px] rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        {settingsMsg && <p className="mt-2 text-sm text-sage">{settingsMsg}</p>}
      </section>

      {/* History */}
      {ordered.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-extrabold text-ink">Historial de reglas</h2>
          <ul className="space-y-2">
            {ordered.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-tile bg-white px-4 py-3 text-sm shadow-soft"
              >
                <span className="font-medium text-ink">{fmtDate(c.startDate)}</span>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="text-xs text-muted underline"
                  aria-label="Borrar registro"
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        Las predicciones son una estimación basada en tus datos y no sirven como
        método anticonceptivo.
      </p>
      <PrivacyLine />
    </div>
  );
}
