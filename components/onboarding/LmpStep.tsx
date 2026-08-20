"use client";

import { type DueDateMethod } from "@/lib/pregnancy";
import type { OnboardingAnswers } from "@/lib/onboarding/progress";

import { BackButton, FIELD_CLASS, PrimaryButton } from "./controls";

const METHOD_LABELS: Record<DueDateMethod, string> = {
  lmp: "Última menstruación",
  ecografia: "Ecografía (fecha probable de parto)",
  fiv: "FIV (transferencia de embrión)",
  conception: "Fecha de concepción conocida",
};

/**
 * "¿Cómo sabés tu fecha?" (B3's four methods).
 *
 * Since K9-F5 this step is reached only by somebody tracking her own
 * pregnancy: a companion arriving on an invite code never sees it, which is
 * what stops the app asking a papá for the first day of his last period.
 */
export function LmpStep({
  answers,
  error,
  today,
  minLmp,
  canContinue,
  onChange,
  onContinue,
  onBack,
}: {
  answers: OnboardingAnswers;
  error: string;
  today: string;
  minLmp: string;
  canContinue: boolean;
  onChange: (patch: Partial<OnboardingAnswers>) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="rounded-card bg-white p-5 shadow-soft">
      <label htmlFor="method" className="block text-sm font-extrabold text-ink">
        ¿Cómo sabés tu fecha?
      </label>
      <select
        id="method"
        value={answers.method}
        onChange={(e) => onChange({ method: e.target.value as DueDateMethod })}
        className={`mt-2 ${FIELD_CLASS}`}
      >
        {(Object.keys(METHOD_LABELS) as DueDateMethod[]).map((m) => (
          <option key={m} value={m}>
            {METHOD_LABELS[m]}
          </option>
        ))}
      </select>

      {answers.method === "lmp" && (
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
            value={answers.lmp}
            min={minLmp}
            max={today}
            onChange={(e) => onChange({ lmp: e.target.value })}
            className={`mt-3 ${FIELD_CLASS}`}
          />
        </>
      )}

      {answers.method === "ecografia" && (
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
            value={answers.dueDateInput}
            onChange={(e) => onChange({ dueDateInput: e.target.value })}
            className={`mt-3 ${FIELD_CLASS}`}
          />
        </>
      )}

      {answers.method === "fiv" && (
        <>
          <label htmlFor="fivDate" className="mt-4 block text-sm font-extrabold text-ink">
            ¿Cuándo fue la transferencia del embrión?
          </label>
          <input
            id="fivDate"
            type="date"
            value={answers.fivTransferDate}
            max={today}
            onChange={(e) => onChange({ fivTransferDate: e.target.value })}
            className={`mt-2 ${FIELD_CLASS}`}
          />
          <label htmlFor="fivDay" className="mt-4 block text-sm font-extrabold text-ink">
            ¿Embrión de qué día?
          </label>
          <select
            id="fivDay"
            value={answers.fivEmbryoDay}
            onChange={(e) =>
              onChange({ fivEmbryoDay: Number(e.target.value) as 3 | 5 })
            }
            className={`mt-2 ${FIELD_CLASS}`}
          >
            <option value={5}>Día 5 (blastocisto)</option>
            <option value={3}>Día 3</option>
          </select>
        </>
      )}

      {answers.method === "conception" && (
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
            value={answers.conceptionDateInput}
            max={today}
            onChange={(e) => onChange({ conceptionDateInput: e.target.value })}
            className={`mt-3 ${FIELD_CLASS}`}
          />
        </>
      )}

      {error && <p className="mt-2 text-sm text-terracotta">{error}</p>}

      <PrimaryButton disabled={!canContinue} onClick={onContinue} label="Continuar" />
      <BackButton onClick={onBack} />
    </div>
  );
}
