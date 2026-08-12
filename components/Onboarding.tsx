"use client";

import { useState } from "react";
import Link from "next/link";
import { db, type AppMode } from "@/lib/db";
import {
  getDueDate,
  lmpFromEcografia,
  lmpFromFiv,
  lmpFromConception,
  getRawWeek,
  MAX_WEEK,
  type DueDateMethod,
} from "@/lib/pregnancy";
import { DEPARTMENTS } from "@/lib/departments";
import { PrivacyLine } from "./PrivacyLine";

// First-run gate (build spec §3/§6): choose a mode, then collect the minimum
// data for that flow. Rendered IN PLACE on / — no redirect, no separate route.
// - "embarazada": due-date method + date(s) → department (city optional) → save.
// - "planeando": department (city optional) → save (no pregnancy record).
type Step = "mode" | "lmp" | "department";

const METHOD_LABELS: Record<DueDateMethod, string> = {
  lmp: "Última menstruación",
  ecografia: "Ecografía (fecha probable de parto)",
  fiv: "FIV (transferencia de embrión)",
  conception: "Fecha de concepción conocida",
};

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<AppMode>("embarazada");
  const [method, setMethod] = useState<DueDateMethod>("lmp");
  const [lmp, setLmp] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [fivTransferDate, setFivTransferDate] = useState("");
  const [fivEmbryoDay, setFivEmbryoDay] = useState<3 | 5>(5);
  const [conceptionDateInput, setConceptionDateInput] = useState("");
  const [dateError, setDateError] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  // LMP can't be more than ~300 days ago or in the future.
  const minLmp = new Date(Date.now() - 300 * 86400000).toISOString().slice(0, 10);

  function chooseMode(m: AppMode) {
    setMode(m);
    setStep(m === "embarazada" ? "lmp" : "department");
  }

  function resolveLmpDate(): number | null {
    switch (method) {
      case "lmp":
        return lmp ? new Date(`${lmp}T00:00:00`).getTime() : null;
      case "ecografia":
        return dueDateInput
          ? lmpFromEcografia(new Date(`${dueDateInput}T00:00:00`).getTime())
          : null;
      case "fiv":
        return fivTransferDate
          ? lmpFromFiv(new Date(`${fivTransferDate}T00:00:00`).getTime(), fivEmbryoDay)
          : null;
      case "conception":
        return conceptionDateInput
          ? lmpFromConception(new Date(`${conceptionDateInput}T00:00:00`).getTime())
          : null;
    }
  }

  function canContinueFromLmp(): boolean {
    switch (method) {
      case "lmp":
        return !!lmp;
      case "ecografia":
        return !!dueDateInput;
      case "fiv":
        return !!fivTransferDate;
      case "conception":
        return !!conceptionDateInput;
    }
  }

  function continueFromLmp() {
    setDateError("");
    const lmpDate = resolveLmpDate();
    if (lmpDate === null || Number.isNaN(lmpDate)) {
      setDateError("Elegí una fecha válida.");
      return;
    }
    if (lmpDate > Date.now()) {
      setDateError("Esa fecha no puede estar en el futuro.");
      return;
    }
    if (getRawWeek(lmpDate) > MAX_WEEK) {
      setDateError(
        "Según esta fecha, el embarazo ya habría llegado a término. Revisá la fecha.",
      );
      return;
    }
    setStep("department");
  }

  async function save() {
    if (!department) return;
    const lmpDate = mode === "embarazada" ? resolveLmpDate() : null;
    if (mode === "embarazada" && lmpDate === null) return;
    setSaving(true);
    setSaveError("");
    try {
      const now = Date.now();
      if (mode === "embarazada" && lmpDate !== null) {
        await db().pregnancy.add({
          lmpDate,
          dueDate: getDueDate(lmpDate),
          method,
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
    } catch {
      setSaveError(
        "No pudimos guardar tus datos en este dispositivo. Si estás en modo privado/incógnito, probá en una ventana normal, o revisá que el navegador permita guardar datos del sitio.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center py-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black tracking-tight text-ink">Bienvenida a Mi Bebé</h1>
        <p className="mt-2 text-sm text-muted">
          Tu embarazo y tu camino para buscarlo, hechos para Paraguay.
        </p>
      </div>

      {step === "mode" && (
        <div className="space-y-3">
          <p className="px-1 text-sm font-extrabold text-ink">
            ¿Cómo querés usar Mi Bebé?
          </p>
          <button
            type="button"
            onClick={() => chooseMode("embarazada")}
            className="block w-full rounded-card bg-white p-5 text-left shadow-soft transition active:scale-[0.99]"
          >
            <p className="text-base font-extrabold text-ink">Estoy embarazada</p>
            <p className="mt-1 text-sm text-muted">
              Seguí tu embarazo semana a semana, con herramientas y recursos.
            </p>
          </button>
          <button
            type="button"
            onClick={() => chooseMode("planeando")}
            className="block w-full rounded-card bg-white p-5 text-left shadow-soft transition active:scale-[0.99]"
          >
            <p className="text-base font-extrabold text-ink">
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
          <label htmlFor="method" className="block text-sm font-extrabold text-ink">
            ¿Cómo sabés tu fecha?
          </label>
          <select
            id="method"
            value={method}
            onChange={(e) => {
              setMethod(e.target.value as DueDateMethod);
              setDateError("");
            }}
            className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
          >
            {(Object.keys(METHOD_LABELS) as DueDateMethod[]).map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>

          {method === "lmp" && (
            <>
              <label htmlFor="lmp" className="mt-4 block text-sm font-extrabold text-ink">
                ¿Cuándo fue el primer día de tu última menstruación?
              </label>
              <p className="mt-1 text-xs text-muted">
                Con esto calculamos tu semana de embarazo. Si no la recordás
                exacta, poné lo más aproximado posible.
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
            </>
          )}

          {method === "ecografia" && (
            <>
              <label htmlFor="due" className="mt-4 block text-sm font-extrabold text-ink">
                ¿Cuál es tu fecha probable de parto?
              </label>
              <p className="mt-1 text-xs text-muted">
                La que te dio tu médico/a en la ecografía. Calculamos tu semana
                a partir de ahí.
              </p>
              <input
                id="due"
                type="date"
                value={dueDateInput}
                onChange={(e) => setDueDateInput(e.target.value)}
                className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
              />
            </>
          )}

          {method === "fiv" && (
            <>
              <label htmlFor="fivDate" className="mt-4 block text-sm font-extrabold text-ink">
                ¿Cuándo fue la transferencia del embrión?
              </label>
              <input
                id="fivDate"
                type="date"
                value={fivTransferDate}
                max={today}
                onChange={(e) => setFivTransferDate(e.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
              />
              <label htmlFor="fivDay" className="mt-4 block text-sm font-extrabold text-ink">
                ¿Embrión de qué día?
              </label>
              <select
                id="fivDay"
                value={fivEmbryoDay}
                onChange={(e) => setFivEmbryoDay(Number(e.target.value) as 3 | 5)}
                className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
              >
                <option value={5}>Día 5 (blastocisto)</option>
                <option value={3}>Día 3</option>
              </select>
            </>
          )}

          {method === "conception" && (
            <>
              <label
                htmlFor="conception"
                className="mt-4 block text-sm font-extrabold text-ink"
              >
                ¿Cuál fue la fecha de concepción?
              </label>
              <p className="mt-1 text-xs text-muted">
                Por ejemplo, si seguiste tu ovulación con precisión.
              </p>
              <input
                id="conception"
                type="date"
                value={conceptionDateInput}
                max={today}
                onChange={(e) => setConceptionDateInput(e.target.value)}
                className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
              />
            </>
          )}

          {dateError && (
            <p className="mt-2 text-sm text-terracotta">{dateError}</p>
          )}

          <button
            type="button"
            disabled={!canContinueFromLmp()}
            onClick={continueFromLmp}
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
          <label htmlFor="dep" className="block text-sm font-extrabold text-ink">
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

          <label htmlFor="city" className="mt-4 block text-sm font-extrabold text-ink">
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

          {saveError && (
            <p className="mt-3 text-sm text-terracotta">{saveError}</p>
          )}

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
        Mi Bebé es informativo y no reemplaza la atención de un profesional de la
        salud. No realiza diagnósticos. Al continuar, aceptás nuestra{" "}
        <Link href="/privacidad" className="underline">
          política de privacidad
        </Link>{" "}
        y{" "}
        <Link href="/terminos" className="underline">
          términos de uso
        </Link>
        .
      </p>
    </div>
  );
}
