"use client";

import { useState } from "react";
import { db, type AppMode } from "@/lib/db";
import { getDueDate } from "@/lib/pregnancy";
import { DEPARTMENTS } from "@/lib/departments";
import { PrivacyLine } from "./PrivacyLine";

// First-run gate (build spec §3/§6): choose a mode, then collect the minimum
// data for that flow. Rendered IN PLACE on / — no redirect, no separate route.
// - "embarazada": LMP date → department (city optional) → save.
// - "planeando": department (city optional) → save (no pregnancy record).
type Step = "mode" | "lmp" | "department";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<AppMode>("embarazada");
  const [lmp, setLmp] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  // LMP can't be more than ~300 days ago or in the future.
  const minLmp = new Date(Date.now() - 300 * 86400000).toISOString().slice(0, 10);

  function chooseMode(m: AppMode) {
    setMode(m);
    setStep(m === "embarazada" ? "lmp" : "department");
  }

  async function save() {
    if (!department) return;
    if (mode === "embarazada" && !lmp) return;
    setSaving(true);
    const now = Date.now();
    if (mode === "embarazada") {
      const lmpDate = new Date(`${lmp}T00:00:00`).getTime();
      await db().pregnancy.add({
        lmpDate,
        dueDate: getDueDate(lmpDate),
        createdAt: now,
      });
    }
    await db().profile.add({
      department,
      city: city.trim() || undefined,
      mode,
      createdAt: now,
    });
    onDone();
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center py-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-medium text-petrol-dark">Bienvenida a Nido</h1>
        <p className="mt-2 text-sm text-muted">
          Tu embarazo y tu camino para buscarlo, hechos para Paraguay.
        </p>
      </div>

      {step === "mode" && (
        <div className="space-y-3">
          <p className="px-1 text-sm font-medium text-ink">
            ¿Cómo querés usar Nido?
          </p>
          <button
            type="button"
            onClick={() => chooseMode("embarazada")}
            className="block w-full rounded-card bg-white p-5 text-left shadow-soft transition active:scale-[0.99]"
          >
            <p className="text-base font-medium text-ink">Estoy embarazada</p>
            <p className="mt-1 text-sm text-muted">
              Seguí tu embarazo semana a semana, con herramientas y recursos.
            </p>
          </button>
          <button
            type="button"
            onClick={() => chooseMode("planeando")}
            className="block w-full rounded-card bg-white p-5 text-left shadow-soft transition active:scale-[0.99]"
          >
            <p className="text-base font-medium text-ink">
              Estoy planeando / buscando
            </p>
            <p className="mt-1 text-sm text-muted">
              Calendario menstrual, días fértiles estimados y checklist
              preconcepción.
            </p>
          </button>
          <p className="px-1 text-xs text-muted">
            Podés cambiar de modo cuando quieras desde Ajustes, sin perder tus datos.
          </p>
        </div>
      )}

      {step === "lmp" && (
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
            onClick={() => setStep("department")}
            className="mt-4 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={() => setStep("mode")}
            className="mt-2 min-h-[44px] w-full text-sm text-muted"
          >
            Volver
          </button>
        </div>
      )}

      {step === "department" && (
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
            onClick={() => setStep(mode === "embarazada" ? "lmp" : "mode")}
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
