"use client";

import { DEPARTMENTS } from "@/lib/departments";
import type { OnboardingAnswers } from "@/lib/onboarding/progress";

import { BackButton, FIELD_CLASS, PrimaryButton } from "./controls";

/**
 * "¿En qué departamento vivís?" — and the step whose exit writes the device row.
 *
 * That ordering is K1's requirement, not a layout detail: everything typed so
 * far becomes durable *before* the account step can send the browser to
 * Google. `saving` and `error` therefore belong to the write, not to this
 * field, which is why they are props rather than local state.
 */
export function DepartmentStep({
  answers,
  saving,
  error,
  onChange,
  onContinue,
  onBack,
}: {
  answers: OnboardingAnswers;
  saving: boolean;
  error: string;
  onChange: (patch: Partial<OnboardingAnswers>) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="rounded-card bg-white p-5 shadow-soft">
      <label htmlFor="dep" className="block text-sm font-extrabold text-ink">
        ¿En qué departamento vivís?
      </label>
      <p className="mt-1 text-xs text-muted">
        Lo usamos para mostrarte sanatorios y recursos cerca tuyo.
      </p>
      <select
        id="dep"
        value={answers.department}
        onChange={(e) => onChange({ department: e.target.value })}
        className={`mt-3 ${FIELD_CLASS}`}
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
        value={answers.city}
        onChange={(e) => onChange({ city: e.target.value })}
        placeholder="Ej: Luque"
        className={`mt-2 ${FIELD_CLASS}`}
      />

      {error && <p className="mt-3 text-sm text-terracotta">{error}</p>}

      <PrimaryButton
        disabled={!answers.department || saving}
        onClick={onContinue}
        label={saving ? "Guardando…" : "Continuar"}
      />
      <BackButton onClick={onBack} />
    </div>
  );
}
