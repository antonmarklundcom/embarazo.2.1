"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import { startSignIn, type SignInState } from "@/app/(app)/cuenta/actions";
import { db, type AppMode, type Role } from "@/lib/db";
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
import { ROLE_ONBOARDING_COPY, ROLE_ORDER } from "@/lib/roleCopy";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/auth/config";
import { fetchAuthStatus, type AuthStatus } from "@/lib/auth/status";
import {
  clearOnboardingDraft,
  readOnboardingDraft,
  writeOnboardingDraft,
} from "@/lib/onboarding/draftStorage";
import {
  draftAnswers,
  emptyAnswers,
  isBlankAnswers,
  isLastStep,
  makeDraft,
  nextStep,
  previousStep,
  resumeStep,
  type OnboardingAnswers,
  type OnboardingContext,
  type OnboardingStep,
} from "@/lib/onboarding/progress";
import { createInviteCode, publishCompanionSnapshot } from "@/lib/sharing/client";
import {
  familyInvitePayload,
  familyInviteClipboardText,
  familyInviteWhatsAppUrl,
  type InviteRole,
} from "@/lib/sharing/inviteLink";

// BUILD-PLAN K1 (docs/FABLE-PLAN-2026-08.md §3) — account-first onboarding.
//
// The flow is: mode → role → fecha → departamento → **cuenta** → nombre del
// bebé → **invitá a tu pareja y familia**. Two things about it are requirements
// rather than layout:
//
//  1. **The device row is written when the departamento step is left**, before
//     the account step can navigate the browser to Google. A user who never
//     comes back still has a working, fully answered app on her phone; the
//     remaining steps only add to it. This also means the account she creates
//     next has local data to adopt (A6), instead of an empty pregnancy.
//  2. **The step and every answer are persisted to localStorage** on each
//     change (`lib/onboarding/progress.ts`), so the OAuth round trip — which is
//     a full page load initiated by somebody else's server — resumes exactly
//     where it left off rather than dumping the user back at "¿Cómo querés usar
//     Mi Bebé?" with everything retyped.
//
// "Seguir sin cuenta" is still here and still reaches the whole app
// (ARCHITECTURE.md §4.2). It is a secondary link under the account button now
// rather than a peer card — the pitch changed, the path did not.

type Step = OnboardingStep;

const METHOD_LABELS: Record<DueDateMethod, string> = {
  lmp: "Última menstruación",
  ecografia: "Ecografía (fecha probable de parto)",
  fiv: "FIV (transferencia de embrión)",
  conception: "Fecha de concepción conocida",
};

const INVITE_ROLE_LABELS: Record<InviteRole, string> = {
  partner: "Mi pareja",
  family: "Familia o amiga",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z"
      />
    </svg>
  );
}

const MARKS: Record<ProviderId, () => React.ReactElement> = {
  google: GoogleMark,
  facebook: FacebookMark,
};

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [answers, setAnswers] = useState<OnboardingAnswers>(emptyAnswers);
  const [hydrated, setHydrated] = useState(false);
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  const [dateError, setDateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const step = answers.step;
  const context: OnboardingContext = useMemo(
    () => ({ mode: answers.mode, signedIn: auth?.signedIn ?? false }),
    [answers.mode, auth?.signedIn],
  );

  // --- draft: restore once, then persist every change ----------------------

  useEffect(() => {
    const draft = readOnboardingDraft();
    if (draft) setAnswers(draftAnswers(draft));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Nothing answered yet means nothing to resume, and an empty draft would
    // claim this device is mid-flow when it is only showing the first screen —
    // which is also what a second device does for a moment while sync pulls the
    // profile down. Going all the way back to the first step drops the draft
    // again, for the same reason.
    if (isBlankAnswers(answers)) clearOnboardingDraft();
    else writeOnboardingDraft(makeDraft(answers, Date.now()));
  }, [answers, hydrated]);

  // The account status decides whether the invite step exists at all, so a
  // resumed draft can name a step that is not in this user's flow yet (or any
  // more). `resumeStep` maps it back onto one that is.
  useEffect(() => {
    if (!hydrated || !auth) return;
    setAnswers((current) => {
      const resumed = resumeStep(current.step, {
        mode: current.mode,
        signedIn: auth.signedIn,
      });
      return resumed === current.step ? current : { ...current, step: resumed };
    });
  }, [hydrated, auth]);

  useEffect(() => {
    let cancelled = false;
    void fetchAuthStatus().then((status) => {
      if (!cancelled) setAuth(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<OnboardingAnswers>) => {
    setAnswers((current) => ({ ...current, ...patch }));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  // LMP can't be more than ~300 days ago or in the future.
  const minLmp = new Date(Date.now() - 300 * 86400000).toISOString().slice(0, 10);

  // --- dates ---------------------------------------------------------------

  function resolveLmpDate(): number | null {
    switch (answers.method) {
      case "lmp":
        return answers.lmp ? new Date(`${answers.lmp}T00:00:00`).getTime() : null;
      case "ecografia":
        return answers.dueDateInput
          ? lmpFromEcografia(new Date(`${answers.dueDateInput}T00:00:00`).getTime())
          : null;
      case "fiv":
        return answers.fivTransferDate
          ? lmpFromFiv(
              new Date(`${answers.fivTransferDate}T00:00:00`).getTime(),
              answers.fivEmbryoDay,
            )
          : null;
      case "conception":
        return answers.conceptionDateInput
          ? lmpFromConception(
              new Date(`${answers.conceptionDateInput}T00:00:00`).getTime(),
            )
          : null;
    }
  }

  function canContinueFromLmp(): boolean {
    switch (answers.method) {
      case "lmp":
        return !!answers.lmp;
      case "ecografia":
        return !!answers.dueDateInput;
      case "fiv":
        return !!answers.fivTransferDate;
      case "conception":
        return !!answers.conceptionDateInput;
    }
  }

  // --- navigation ----------------------------------------------------------

  const goTo = useCallback(
    (target: Step | null) => {
      if (target === null) {
        clearOnboardingDraft();
        onDone();
        return;
      }
      setDateError("");
      setSaveError("");
      setAnswers((current) => ({ ...current, step: target }));
    },
    [onDone],
  );

  function goBack() {
    const target = previousStep(step, context);
    if (target) goTo(target);
  }

  function chooseMode(mode: AppMode) {
    setAnswers((current) => ({ ...current, mode, step: "role" }));
  }

  function chooseRole(role: Role) {
    setAnswers((current) => ({
      ...current,
      role,
      step: nextStep("role", { ...context, mode: current.mode })!,
    }));
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
    goTo(nextStep("lmp", context));
  }

  // --- the device row ------------------------------------------------------

  /**
   * Write (or correct) the profile and pregnancy rows on this device.
   *
   * Runs when the departamento step is left, so everything the user has typed
   * is durable *before* the account step can send the browser to Google. It
   * upserts rather than inserts, because "Volver" from a later step and then
   * forward again must not leave two profiles behind.
   */
  async function persistProfile(): Promise<boolean> {
    setSaving(true);
    setSaveError("");
    try {
      const now = Date.now();
      const lmpDate = answers.mode === "embarazada" ? resolveLmpDate() : null;

      if (answers.mode === "embarazada" && lmpDate !== null) {
        const existing = (await db().pregnancy.toArray())[0];
        const fields = {
          lmpDate,
          dueDate: getDueDate(lmpDate),
          method: answers.method,
        };
        if (existing?.id) await db().pregnancy.update(existing.id, fields);
        else await db().pregnancy.add({ ...fields, createdAt: now });
      }

      const existingProfile = (await db().profile.toArray())[0];
      const fields = {
        department: answers.department,
        city: answers.city.trim() || undefined,
        mode: answers.mode,
        role: answers.role,
      };
      if (existingProfile?.id) {
        await db().profile.update(existingProfile.id, fields);
      } else {
        await db().profile.add({ ...fields, createdAt: now });
      }

      setAnswers((current) => ({ ...current, profileSaved: true }));
      return true;
    } catch {
      setSaveError(
        "No pudimos guardar tus datos en este dispositivo. Si estás en modo privado/incógnito, probá en una ventana normal, o revisá que el navegador permita guardar datos del sitio.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function continueFromDepartment() {
    if (!answers.department) return;
    if (!(await persistProfile())) return;
    goTo(nextStep("department", context));
  }

  /** The baby's nickname lands on the profile row that already exists. */
  async function continueFromBabyName() {
    setSaving(true);
    setSaveError("");
    try {
      const name = answers.babyName.trim();
      const existing = (await db().profile.toArray())[0];
      if (existing?.id) {
        await db().profile.update(existing.id, {
          babies: name ? [{ name }] : undefined,
        });
      }
    } catch {
      // A nickname is decoration; failing to store it must not block the flow.
    } finally {
      setSaving(false);
    }
    goTo(nextStep("bebe", context));
  }

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-md flex-col justify-center py-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black tracking-tight text-ink">Bienvenida a Mi Bebé</h1>
        <p className="mt-2 text-sm text-muted">
          Tu embarazo y tu familia, en una sola app — hecha para Paraguay.
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
          <BackButton onClick={goBack} />
        </div>
      )}

      {step === "lmp" && (
        <div className="rounded-card bg-white p-5 shadow-soft">
          <label htmlFor="method" className="block text-sm font-extrabold text-ink">
            ¿Cómo sabés tu fecha?
          </label>
          <select
            id="method"
            value={answers.method}
            onChange={(e) => {
              update({ method: e.target.value as DueDateMethod });
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
                onChange={(e) => update({ lmp: e.target.value })}
                className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
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
                onChange={(e) => update({ dueDateInput: e.target.value })}
                className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
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
                onChange={(e) => update({ fivTransferDate: e.target.value })}
                className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
              />
              <label htmlFor="fivDay" className="mt-4 block text-sm font-extrabold text-ink">
                ¿Embrión de qué día?
              </label>
              <select
                id="fivDay"
                value={answers.fivEmbryoDay}
                onChange={(e) =>
                  update({ fivEmbryoDay: Number(e.target.value) as 3 | 5 })
                }
                className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
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
                onChange={(e) => update({ conceptionDateInput: e.target.value })}
                className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
              />
            </>
          )}

          {dateError && <p className="mt-2 text-sm text-terracotta">{dateError}</p>}

          <PrimaryButton
            disabled={!canContinueFromLmp()}
            onClick={continueFromLmp}
            label="Continuar"
          />
          <BackButton onClick={goBack} />
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
            value={answers.department}
            onChange={(e) => update({ department: e.target.value })}
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
            value={answers.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="Ej: Luque"
            className="mt-2 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
          />

          {saveError && <p className="mt-3 text-sm text-terracotta">{saveError}</p>}

          <PrimaryButton
            disabled={!answers.department || saving}
            onClick={() => void continueFromDepartment()}
            label={saving ? "Guardando…" : "Continuar"}
          />
          <BackButton onClick={goBack} />
        </div>
      )}

      {step === "cuenta" && (
        <AccountStep
          auth={auth}
          isLast={isLastStep("cuenta", context)}
          onSkip={() => goTo(nextStep("cuenta", { ...context, signedIn: false }))}
          onContinue={() => goTo(nextStep("cuenta", context))}
          onBack={goBack}
        />
      )}

      {step === "bebe" && (
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
            onChange={(e) => update({ babyName: e.target.value })}
            placeholder="Ej: Silvia"
            className="mt-3 min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none"
          />

          <PrimaryButton
            disabled={saving}
            onClick={() => void continueFromBabyName()}
            label={isLastStep("bebe", context) ? "Empezar" : "Continuar"}
          />
          <BackButton onClick={goBack} />
        </div>
      )}

      {step === "invitar" && (
        <InviteStep onFinish={() => goTo(null)} onBack={goBack} />
      )}

      <div className="mt-6 rounded-card border border-sage/30 bg-sage/5 p-4">
        <p className="text-xs leading-relaxed text-muted">
          Con cuenta, tu embarazo se guarda en nuestro servidor y lo recuperás
          si cambiás de teléfono. Sin cuenta, todo queda solo en este aparato.
          En los dos casos podés borrar todo cuando quieras desde Ajustes, y tus
          notas y tus fotos nunca se comparten con tu familia.
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

// ---------------------------------------------------------------------------
// Shared controls
// ---------------------------------------------------------------------------

function PrimaryButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-4 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 min-h-[44px] w-full text-sm text-muted"
    >
      Volver
    </button>
  );
}

// ---------------------------------------------------------------------------
// The account step
// ---------------------------------------------------------------------------

/**
 * Four states, and none of them is a dead end:
 *   • still asking the server   → a quiet placeholder, never a blocked flow
 *   • signed in already         → say so and move on
 *   • providers configured      → consent + the provider buttons
 *   • no providers (or offline) → say so plainly and continue without one
 *
 * The consent checkbox is the same load-bearing control A2 built on /cuenta,
 * for the same reason (ARCHITECTURE.md §8): the server refuses a sign-in whose
 * request carries no consent ticket, and only this form can mint one.
 */
function AccountStep({
  auth,
  isLast,
  onSkip,
  onContinue,
  onBack,
}: {
  auth: AuthStatus | null;
  isLast: boolean;
  onSkip: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    startSignIn,
    {},
  );
  const [consented, setConsented] = useState(false);

  if (auth === null) {
    return (
      <div className="rounded-card bg-white p-5 shadow-soft">
        <p className="text-sm font-extrabold text-ink">Un segundo…</p>
        <p className="mt-1 text-sm text-muted">
          Estamos viendo si podés crear tu cuenta desde acá.
        </p>
      </div>
    );
  }

  if (auth.signedIn) {
    return (
      <div className="rounded-card bg-white p-5 shadow-soft">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tu cuenta
        </p>
        <h2 className="mt-1 text-lg font-black text-ink">Listo, ya entraste</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Tu embarazo se guarda solo y lo vas a tener de vuelta en cualquier
          teléfono donde entres con esta misma cuenta.
        </p>
        <PrimaryButton
          onClick={onContinue}
          label={isLast ? "Empezar" : "Continuar"}
        />
      </div>
    );
  }

  if (auth.providers.length === 0) {
    return (
      <div className="rounded-card bg-white p-5 shadow-soft">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tu cuenta
        </p>
        <h2 className="mt-1 text-lg font-black text-ink">
          Por ahora, sin cuenta
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          En esta versión no podemos crear tu cuenta — puede ser que estés sin
          internet, o que este servidor todavía no tenga el ingreso activo. La
          app funciona completa igual y podés crear tu cuenta más adelante desde
          Ajustes; tus datos de ahora se suben en ese momento.
        </p>
        <PrimaryButton onClick={onSkip} label="Seguir sin cuenta" />
        <BackButton onClick={onBack} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-card bg-white p-5 shadow-soft">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Tu cuenta
        </p>
        <h2 className="mt-1 text-lg font-black text-ink">
          Guardá tu embarazo y compartilo
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm font-semibold text-ink">
          <li>• Copia de seguridad: cambiás de teléfono y está todo ahí.</li>
          <li>• Tu pareja y tu familia pueden acompañarte desde su celular.</li>
          <li>• Avisos de tu próximo control, si los querés.</li>
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          De Google recibimos solo tu nombre, tu correo y tu foto de perfil.
          Nada más, nunca.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        {/* Onboarding is the one place a sign-in must come back to: `from`
            sends the user to "/" instead of /ajustes, where the saved draft
            picks the flow up again. The value is one of a closed set on the
            server — it is not a redirect target. */}
        <input type="hidden" name="from" value="onboarding" />

        <section className="rounded-card border border-line bg-pastel-celeste p-4">
          <label
            htmlFor="onboarding-consent"
            className="flex items-start gap-3 text-[15px] font-semibold leading-relaxed text-ink"
          >
            <input
              id="onboarding-consent"
              name="consent"
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink/20 accent-petrol"
            />
            <span>
              Acepto que Mi Bebé guarde en su servidor mis datos de salud del
              embarazo (semanas, síntomas, ánimo, controles, peso) para
              sincronizarlos entre mis dispositivos.
            </span>
          </label>
          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-ink/80">
            <li>
              • Tus fotos de la panza y del carné <strong>no</strong> se suben:
              quedan siempre en tu teléfono.
            </li>
            <li>
              • Podés borrar tu cuenta y todos tus datos del servidor cuando
              quieras, desde Ajustes.
            </li>
            <li>• Nunca vendemos ni compartimos tus datos de salud.</li>
          </ul>
        </section>

        {auth.providers.map((id) => {
          const Mark = MARKS[id];
          return (
            <button
              key={id}
              type="submit"
              name="provider"
              value={id}
              disabled={pending}
              className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-4 text-[15px] font-extrabold text-ink shadow-soft transition active:scale-[0.99] disabled:opacity-60"
            >
              <Mark />
              {pending ? "Abriendo…" : `Crear cuenta con ${PROVIDER_LABELS[id]}`}
            </button>
          );
        })}

        {!consented && (
          <p className="px-1 text-xs text-muted">
            Marcá la casilla de arriba para poder crear tu cuenta.
          </p>
        )}

        {state.error && (
          <p
            role="alert"
            className="rounded-tile border border-terracotta/30 bg-terracotta/5 px-3 py-2 text-sm font-semibold text-terracotta"
          >
            {state.error}
          </p>
        )}
      </form>

      {/* Secondary, but never hidden: ARCHITECTURE.md §4.2 keeps this a
          supported way to use the app. It stopped being the pitch, not the
          path. */}
      <button
        type="button"
        onClick={onSkip}
        className="min-h-[44px] w-full text-sm font-bold text-petrol underline"
      >
        Seguir sin cuenta
      </button>
      <BackButton onClick={onBack} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The invite step
// ---------------------------------------------------------------------------

/**
 * "Invitá a tu pareja y a tu familia", inside onboarding.
 *
 * The invite itself is E1's: a single-use code, created on the server against
 * the caller's own pregnancy. What K1 adds is the link that carries it and the
 * WhatsApp hand-off — Paraguay's actual distribution channel — plus publishing
 * the companion snapshot first, so whoever accepts sees a real week instead of
 * an empty card.
 */
function InviteStep({
  onFinish,
  onBack,
}: {
  onFinish: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [role, setRole] = useState<InviteRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const published = useRef(false);

  useEffect(() => {
    // The owner's device is the only thing that can publish the snapshot
    // (E1). Doing it here means the invitee's first open shows the week.
    if (published.current) return;
    published.current = true;
    void publishCompanionSnapshot();
  }, []);

  const payload = code && role ? familyInvitePayload(APP_URL, code, role) : null;

  async function invite(target: InviteRole) {
    setBusy(true);
    setMessage("");
    const created = await createInviteCode(target);
    setBusy(false);
    if (!created) {
      setMessage("No pudimos crear el código. ¿Tenés conexión?");
      return;
    }
    setRole(target);
    setCode(created.code);
  }

  async function copyLink() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(familyInviteClipboardText(payload));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage("No pudimos copiar el link. Podés pasarle el código a mano.");
    }
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-soft">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Tu familia
      </p>
      <h2 className="mt-1 text-lg font-black text-ink">
        Invitá a quien te acompaña
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Van a ver tu semana, tu fecha probable de parto y tu próximo control
        desde su propio teléfono. <strong>No van a ver</strong> tus notas, tus
        síntomas, tu peso ni tus fotos.
      </p>

      <div className="mt-4 flex gap-2">
        {(Object.keys(INVITE_ROLE_LABELS) as InviteRole[]).map((r) => (
          <button
            key={r}
            type="button"
            disabled={busy}
            onClick={() => void invite(r)}
            className={`min-h-[44px] flex-1 rounded-tile px-3 text-sm font-extrabold transition active:scale-[0.99] disabled:opacity-60 ${
              role === r ? "bg-petrol text-white" : "bg-cream text-petrol"
            }`}
          >
            {INVITE_ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {code && (
        <div className="mt-4 rounded-tile bg-pastel-salvia p-3">
          <p className="text-xs text-ink">
            {payload
              ? "Mandale este link por WhatsApp:"
              : "Pasale este código:"}
          </p>
          <p className="mt-1 text-2xl font-black tracking-[3px] text-ink">
            {code}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Sirve una sola vez y vence en 14 días.
          </p>

          {payload && (
            <div className="mt-3 space-y-2">
              <a
                href={familyInviteWhatsAppUrl(payload)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] w-full items-center justify-center rounded-tile bg-whatsapp px-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
              >
                Mandar por WhatsApp
              </a>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="min-h-[44px] w-full rounded-tile bg-white px-4 text-sm font-extrabold text-petrol shadow-soft"
              >
                {copied ? "Link copiado" : "Copiar el link"}
              </button>
            </div>
          )}
        </div>
      )}

      {message && <p className="mt-3 text-sm text-terracotta">{message}</p>}

      <PrimaryButton onClick={onFinish} label="Empezar" />
      <p className="mt-2 px-1 text-center text-xs text-muted">
        Podés invitar a más gente después, desde Familia.
      </p>
      <BackButton onClick={onBack} />
    </div>
  );
}
