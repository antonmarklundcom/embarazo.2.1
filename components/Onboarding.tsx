"use client";

import { useState } from "react";
import Link from "next/link";
import { db, type AppMode, type Role } from "@/lib/db";
import { getDueDate, lmpFromDueDate, getRawWeek, MAX_WEEK } from "@/lib/pregnancy";
import { DEPARTMENTS } from "@/lib/departments";
import { ROLE_ONBOARDING_COPY, ROLE_ORDER } from "@/lib/roleCopy";
import { PrivacyLine } from "./PrivacyLine";

// First-run gate (build spec §3/§6): choose a mode, then a relationship role
// (B1, feature map #1), then collect the minimum data for that flow.
// Rendered IN PLACE on / — no redirect, no separate route.
// - "embarazada": LMP or FPP date → department (city optional) → save.
// - "planeando": department (city optional) → save (no pregnancy record).
type Step = "mode" | "role" | "lmp" | "department";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<AppMode>("embarazada");
  const [role, setRole] = useState<Role>("mama");
  const [useDueDate, setUseDueDate] = useState(false);
  const [lmp, setLmp] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [dateError, setDateError] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [babyName, setBabyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  // LMP can't be more than ~300 days ago or in the future.
  const minLmp = new Date(Date.now() - 300 * 86400000).toISOString().slice(0, 10);

  function chooseMode(m: AppMode) {
    setMode(m);
    setStep("role");
  }

  function chooseRole(r: Role) {
    setRole(r);
    setStep(mode === "embarazada" ? "lmp" : "department");
  }

  function resolveLmpDate(): number | null {
    if (useDueDate) {
      if (!dueDateInput) return null;
      return lmpFromDueDate(new Date(`${dueDateInput}T00:00:00`).getTime());
    }
    if (!lmp) return null;
    return new Date(`${lmp}T00:00:00`).getTime();
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
          createdAt: now,
        });
      }
      const trimmedBabyName = babyName.trim();
      await db().profile.add({
        department,
        city: city.trim() || undefined,
        mode,
        babies: trimmedBabyName ? [{ name: trimmedBabyName }] : undefined,
        role,
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

      {step === "role" && (
        <div className="space-y-3">
          <p className="px-1 text-sm font-extrabold text-ink">
            ¿Cómo te describís vos?
          </p>
          {ROLE_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => chooseRole(r)}
              className="block w-full rounded-card bg-white p-5 text-left shadow-soft transition active:scale-[0.99]"
            >
              <p className="text-base font-extrabold text-ink">
                {ROLE_ONBOARDING_COPY[r].title}
              </p>
              <p className="mt-1 text-sm text-muted">{ROLE_ONBOARDING_COPY[r].desc}</p>
            </button>
          ))}
          <p className="px-1 text-xs text-muted">
            Esto ajusta cómo te habla la app. Podés cambiarlo cuando quieras
            desde Ajustes.
          </p>
          <button
            type="button"
            onClick={() => setStep("mode")}
            className="mt-1 min-h-[44px] w-full text-sm text-muted"
          >
            Volver
          </button>
        </div>
      )}

      {step === "lmp" && (
        <div className="rounded-card bg-white p-5 shadow-soft">
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={useDueDate}
              onChange={(e) => {
                setUseDueDate(e.target.checked);
                setDateError("");
              }}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-black/20 accent-petrol"
            />
            <span>No sé mi última regla — usar fecha probable de parto</span>
          </label>

          {!useDueDate ? (
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
          ) : (
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

          {dateError && (
            <p className="mt-2 text-sm text-terracotta">{dateError}</p>
          )}

          <button
            type="button"
            disabled={useDueDate ? !dueDateInput : !lmp}
            onClick={continueFromLmp}
            className="mt-4 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={() => setStep("role")}
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

          {mode === "embarazada" && (
            <>
              <label htmlFor="babyName" className="mt-4 block text-sm font-extrabold text-ink">
                Nombre de tu bebé{" "}
                <span className="font-normal text-muted">(opcional, si ya lo elegiste)</span>
              </label>
              <p className="mt-1 text-xs text-muted">
                Lo usamos para personalizar la app. Si son mellizos, podés
                agregar el segundo nombre después, desde Ajustes.
              </p>
              <input
                id="babyName"
                type="text"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                placeholder="Ej: Silvia"
                className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
              />
            </>
          )}

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
            onClick={() => setStep(mode === "embarazada" ? "lmp" : "role")}
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
