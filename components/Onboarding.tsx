"use client";

import { useState } from "react";
import Link from "next/link";
import {
  db,
  USER_ROLES,
  USER_ROLE_LABELS,
  type AppMode,
  type UserRole,
} from "@/lib/db";
import { getRawWeek, MAX_WEEK } from "@/lib/pregnancy";
import {
  DEFAULT_WEEK_DISPLAY,
  dueDateFromInput,
  lmpFromInput,
} from "@/lib/dueDate";
import { DEPARTMENTS } from "@/lib/departments";
import { PrivacyLine } from "./PrivacyLine";
import {
  DateMethodFields,
  EMPTY_DATE_VALUE,
  toDueDateInput,
  type DateMethodValue,
} from "./onboarding/DateMethodStep";

// First-run gate (build spec §3/§6): choose a mode, then collect the minimum
// data for that flow. Rendered IN PLACE on / — no redirect, no separate route.
//
// BUILD-PLAN B1/B2/B3 reshaped this:
//   mode → role → date (five entry methods) → nickname (optional) → department
// The nickname step is deliberately skippable and one tap from done: it is the
// warmest moment in onboarding, but nobody should be blocked by not having
// picked a name yet.
type Step = "mode" | "role" | "date" | "baby" | "department";

const ROLE_HINTS: Record<UserRole, string> = {
  mama: "Vas a ver todo: tu semana, tus registros y tus herramientas.",
  papa: "Vas a poder seguir el embarazo y saber cómo acompañar.",
  acompanante: "Seguí el embarazo y enterate de cómo ayudar en cada semana.",
  familiar: "Seguí el embarazo de alguien cercano, semana a semana.",
};

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<AppMode>("embarazada");
  const [role, setRole] = useState<UserRole>("mama");
  const [dateValue, setDateValue] = useState<DateMethodValue>(EMPTY_DATE_VALUE);
  const [dateError, setDateError] = useState("");
  const [nickname, setNickname] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function chooseMode(m: AppMode) {
    setMode(m);
    setStep("role");
  }

  function chooseRole(r: UserRole) {
    setRole(r);
    setStep(mode === "embarazada" ? "date" : "department");
  }

  function resolveLmpDate(): number | null {
    const input = toDueDateInput(dateValue);
    return input === null ? null : lmpFromInput(input);
  }

  function continueFromDate() {
    setDateError("");
    const input = toDueDateInput(dateValue);
    if (input === null) {
      setDateError("Completá los datos para poder calcular tu semana.");
      return;
    }
    const lmpDate = lmpFromInput(input);
    if (Number.isNaN(lmpDate)) {
      setDateError("Elegí una fecha válida.");
      return;
    }
    if (lmpDate > Date.now()) {
      setDateError("Esa fecha no puede estar en el futuro.");
      return;
    }
    if (getRawWeek(lmpDate) > MAX_WEEK) {
      setDateError(
        "Según estos datos, el embarazo ya habría llegado a término. Revisá la fecha.",
      );
      return;
    }
    setStep("baby");
  }

  async function save() {
    if (!department) return;
    const input = mode === "embarazada" ? toDueDateInput(dateValue) : null;
    const lmpDate = mode === "embarazada" ? resolveLmpDate() : null;
    if (mode === "embarazada" && lmpDate === null) return;

    setSaving(true);
    setSaveError("");
    try {
      const now = Date.now();
      if (mode === "embarazada" && lmpDate !== null && input !== null) {
        await db().pregnancy.add({
          lmpDate,
          dueDate: dueDateFromInput(input),
          dueDateMethod: input.method,
          weekDisplay: DEFAULT_WEEK_DISPLAY,
          createdAt: now,
        });
        // Always create the baby row, named or not: it is where the nickname
        // lives later, and creating it now keeps the twins model uniform.
        await db().babies.add({
          order: 1,
          nickname: nickname.trim() || undefined,
          createdAt: now,
        });
      }
      await db().profile.add({
        department,
        city: city.trim() || undefined,
        mode,
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
        <h1 className="text-2xl font-black tracking-tight text-ink">
          Bienvenida a Mi Bebé
        </h1>
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
            Podés cambiar de modo cuando quieras desde Ajustes, sin perder tus
            datos.
          </p>
        </div>
      )}

      {step === "role" && (
        <div className="space-y-3">
          <p className="px-1 text-sm font-extrabold text-ink">
            ¿Quién sos vos en esta historia?
          </p>
          {USER_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => chooseRole(r)}
              className="block w-full rounded-card bg-white p-4 text-left shadow-soft transition active:scale-[0.99]"
            >
              <p className="text-[15px] font-extrabold text-ink">
                {USER_ROLE_LABELS[r]}
              </p>
              <p className="mt-0.5 text-sm text-muted">{ROLE_HINTS[r]}</p>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setStep("mode")}
            className="min-h-[44px] w-full text-sm text-muted"
          >
            Volver
          </button>
        </div>
      )}

      {step === "date" && (
        <div className="rounded-card bg-white p-5 shadow-soft">
          <DateMethodFields
            value={dateValue}
            onChange={(next) => {
              setDateValue(next);
              setDateError("");
            }}
          />

          {dateError && <p className="mt-3 text-sm text-terracotta">{dateError}</p>}

          <button
            type="button"
            onClick={continueFromDate}
            className="mt-4 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
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

      {step === "baby" && (
        <div className="rounded-card bg-white p-5 shadow-soft">
          <label htmlFor="nickname" className="block text-sm font-extrabold text-ink">
            ¿Ya le tienen un apodo?
          </label>
          <p className="mt-1 text-xs text-muted">
            Es opcional, y lo podés cambiar cuando quieras. Sirve para que la app
            te hable de tu bebé por su nombre.
          </p>
          <input
            id="nickname"
            type="text"
            value={nickname}
            maxLength={24}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ej: Poroto, Silvia, Peque"
            className="mt-3 min-h-[44px] w-full rounded-tile border border-line bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
          />

          <button
            type="button"
            onClick={() => setStep("department")}
            className="mt-4 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
          >
            Continuar
          </button>
          <p className="mt-2 text-center text-xs text-muted">
            Si todavía no tienen apodo, dejalo vacío y seguí.
          </p>
          <button
            type="button"
            onClick={() => setStep("date")}
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
            className="mt-3 min-h-[44px] w-full rounded-tile border border-line bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
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
            className="mt-2 min-h-[44px] w-full rounded-tile border border-line bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
          />

          {saveError && <p className="mt-3 text-sm text-terracotta">{saveError}</p>}

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
            onClick={() => setStep(mode === "embarazada" ? "baby" : "role")}
            className="mt-2 min-h-[44px] w-full text-sm text-muted"
          >
            Volver
          </button>
        </div>
      )}

      <div className="mt-6 rounded-card border border-sage/30 bg-sage/5 p-4">
        <PrivacyLine />
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Podés usar la app entera sin crear cuenta. Esta información se guarda
          en este dispositivo y la podés borrar cuando quieras desde Ajustes.
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
