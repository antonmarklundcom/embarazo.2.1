"use client";

import type { OnboardingAnswers } from "@/lib/onboarding/progress";

import { BackButton, FIELD_CLASS, PrimaryButton } from "./controls";

/** "¿Cómo le decís a tu bebé?" (B2). */
export function BabyStep({
  answers,
  saving,
  isLast,
  onChange,
  onContinue,
  onBack,
}: {
  answers: OnboardingAnswers;
  saving: boolean;
  isLast: boolean;
  onChange: (patch: Partial<OnboardingAnswers>) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="rounded-card bg-white p-5 shadow-soft">
      <label htmlFor="babyName" className="block text-sm font-extrabold text-ink">
        ¿Cómo le decís a tu bebé?
      </label>
      <p className="mt-1 text-xs text-muted">
        Puede ser su nombre, o el apodo que usan en casa mientras deciden.
        Con esto la app te habla de él o de ella por su nombre. Si son
        mellizos, agregás el segundo desde Ajustes.
      </p>
      <input
        id="babyName"
        type="text"
        value={answers.babyName}
        onChange={(e) => onChange({ babyName: e.target.value })}
        placeholder="Ej: Silvia"
        className={`mt-3 ${FIELD_CLASS}`}
      />

      <PrimaryButton
        disabled={saving}
        onClick={onContinue}
        label={isLast ? "Empezar" : "Continuar"}
      />
      <BackButton onClick={onBack} />
    </div>
  );
}
