"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { getDueDate } from "@/lib/pregnancy";
import { DEPARTMENTS } from "@/lib/departments";
import { PrivacyLine } from "./PrivacyLine";

// First-run gate (build spec §6): LMP date → department (city optional) → save.
// Rendered IN PLACE on / — no redirect, no separate route.
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<0 | 1>(0);
  const [lmp, setLmp] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  // LMP can't be more than ~300 days ago or in the future.
  const minLmp = new Date(Date.now() - 300 * 86400000).toISOString().slice(0, 10);

  async function save() {
    if (!lmp || !department) return;
    setSaving(true);
    const lmpDate = new Date(`${lmp}T00:00:00`).getTime();
    const now = Date.now();
    await db().pregnancy.add({
      lmpDate,
      dueDate: getDueDate(lmpDate),
      createdAt: now,
    });
    await db().profile.add({
      department,
      city: city.trim() || undefined,
      createdAt: now,
    });
    onDone();
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center py-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-medium text-petrol-dark">Bienvenida a Nido</h1>
        <p className="mt-2 text-sm text-muted">
          Tu embarazo, semana a semana, hecho para Paraguay.
        </p>
      </div>

      {step === 0 && (
        <div className="rounded-card bg-white p-5 shadow-soft">
          <label htmlFor="lmp" className="block text-sm font-medium text-ink">
            ¿Cuándo fue el primer día de tu última menstruación?
          </label>
          <p className="mt-1 text-xs text-muted">
            Con esto calculamos tu semana de embarazo. Si no la recordás exacta,
            poné lo más aproximado posible.
          </p>
          <input
            id="lmp"
            type="date"
            value={lmp}
            min={minLmp}
            max={today}
            onChange={(e) => setLmp(e.target.value)}
            className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
          />
          <button
            type="button"
            disabled={!lmp}
            onClick={() => setStep(1)}
            className="mt-4 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="rounded-card bg-white p-5 shadow-soft">
          <label htmlFor="dep" className="block text-sm font-medium text-ink">
            ¿En qué departamento vivís?
          </label>
          <p className="mt-1 text-xs text-muted">
            Lo usamos para mostrarte sanatorios y recursos cerca tuyo.
          </p>
          <select
            id="dep"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
          >
            <option value="">Elegí tu departamento</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>

          <label htmlFor="city" className="mt-4 block text-sm font-medium text-ink">
            Ciudad <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ej: Luque"
            className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
          />

          <button
            type="button"
            disabled={!department || saving}
            onClick={save}
            className="mt-5 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Empezar"}
          </button>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="mt-2 min-h-[44px] w-full text-sm text-muted"
          >
            Volver
          </button>
        </div>
      )}

      <div className="mt-6 rounded-card border border-sage/30 bg-sage/5 p-4">
        <PrivacyLine />
        <p className="mt-2 text-xs leading-relaxed text-muted">
          No te pedimos cuenta, ni correo, ni teléfono. Esta información se guarda
          solo en este dispositivo y la podés borrar cuando quieras desde Ajustes.
        </p>
      </div>

      <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-muted">
        Nido es informativo y no reemplaza la atención de un profesional de la
        salud. No realiza diagnósticos.
      </p>
    </div>
  );
}
