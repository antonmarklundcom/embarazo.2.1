"use client";

import { WORK_SITUATIONS } from "@/lib/derechos";
import { CARE_SETTINGS } from "@/lib/onboarding/personalisation";
import type { OnboardingAnswers } from "@/lib/onboarding/progress";

import { BackButton, PrimaryButton } from "./controls";

// K9-F5 (docs/FABLE-PLAN-2026-08.md §3) — onboarding depth.
//
// Three questions, on one screen, all skippable. Each of the three is here
// because the app already had a place that needed the answer and asked for it
// too late or not at all:
//
//   • ¿primer embarazo?  → which guías lead the home rail.
//   • ¿dónde te atendés? → the wording of the two hedged checklist rows, and
//                          (K10) which column of the price guide opens first.
//   • ¿trabajás?         → `/derechos`, which asked this on every visit and
//                          forgot the answer on every exit.
//
// One screen rather than three steps, because three more taps between "estoy
// embarazada" and a working app is how an onboarding flow starts losing people
// — and because these three answers are the same *kind* of thing, so they read
// as one question about her situation rather than as an interrogation.
//
// "Prefiero no decir" is a real, first-class answer on all three, and choosing
// it leaves the app byte-for-byte the one that shipped before this feature
// (`isUnanswered` in lib/onboarding/personalisation.ts). A pregnancy app that
// makes a woman declare where she is treated before it will show her anything
// has misunderstood what it is for.
export function PerfilStep({
  answers,
  onChange,
  onContinue,
  onBack,
}: {
  answers: OnboardingAnswers;
  onChange: (patch: Partial<OnboardingAnswers>) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="rounded-card bg-white p-5 shadow-soft">
      <h2 className="text-lg font-black text-ink">Contanos un poco más</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Con esto la app te muestra lo que te sirve a vos: tus derechos, tu
        checklist y las guías que te tocan. Todo esto queda en tu teléfono y
        podés cambiarlo o saltearlo.
      </p>

      <Question label="¿Es tu primer embarazo?">
        <Pill
          label="Sí, es el primero"
          selected={answers.firstPregnancy === "si"}
          onClick={() => onChange({ firstPregnancy: "si" })}
        />
        <Pill
          label="No, ya tuve otro"
          selected={answers.firstPregnancy === "no"}
          onClick={() => onChange({ firstPregnancy: "no" })}
        />
        <Pill
          label="Prefiero no decir"
          selected={answers.firstPregnancy === ""}
          onClick={() => onChange({ firstPregnancy: "" })}
        />
      </Question>

      <Question label="¿Dónde te vas a atender?">
        {CARE_SETTINGS.map((setting) => (
          <Pill
            key={setting.key}
            label={setting.label}
            hint={setting.hint}
            selected={answers.careSetting === setting.key}
            onClick={() => onChange({ careSetting: setting.key })}
          />
        ))}
        <Pill
          label="Todavía no sé"
          selected={answers.careSetting === ""}
          onClick={() => onChange({ careSetting: "" })}
        />
      </Question>

      <Question label="¿Trabajás?">
        {WORK_SITUATIONS.map((situation) => (
          <Pill
            key={situation.key}
            label={situation.label}
            hint={situation.hint}
            selected={answers.workSituation === situation.key}
            onClick={() => onChange({ workSituation: situation.key })}
          />
        ))}
        <Pill
          label="Prefiero no decir"
          selected={answers.workSituation === ""}
          onClick={() => onChange({ workSituation: "" })}
        />
      </Question>

      <PrimaryButton onClick={onContinue} label="Continuar" />
      <BackButton onClick={onBack} />
    </div>
  );
}

function Question({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-extrabold text-ink">{label}</legend>
      <div className="mt-2 space-y-2">{children}</div>
    </fieldset>
  );
}

/**
 * `aria-pressed` rather than a radio group, matching `/derechos`.
 *
 * The answers are not required and there is no submit to validate against, so
 * the control that fits is a toggle that says whether it is on — not a form
 * field that implies one of these must be chosen before anything can proceed.
 */
function Pill({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`block min-h-[44px] w-full rounded-tile border px-3 py-2 text-left transition active:scale-[0.99] ${
        selected
          ? "border-petrol bg-petrol text-white"
          : "border-black/10 bg-cream text-ink"
      }`}
    >
      <span className="text-sm font-semibold">{label}</span>
      {hint && (
        <span
          className={`mt-0.5 block text-xs ${selected ? "text-white/70" : "text-muted"}`}
        >
          {hint}
        </span>
      )}
    </button>
  );
}
