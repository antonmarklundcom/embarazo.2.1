"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { db, type AppMode, type Role } from "@/lib/db";
import { APP_NAME } from "@/lib/brand";
import { toDateInput } from "@/lib/appointments";
import {
  getDueDate,
  lmpFromEcografia,
  lmpFromFiv,
  lmpFromConception,
  getCurrentWeek,
  getRawWeek,
  MAX_WEEK,
} from "@/lib/pregnancy";
import { markWeekSeen } from "@/lib/newWeek";
import { fetchAuthStatus, type AuthStatus } from "@/lib/auth/status";
import {
  clearOnboardingDraft,
  readOnboardingDraft,
  writeOnboardingDraft,
} from "@/lib/onboarding/draftStorage";
import {
  answeredProfileFields,
  draftAnswers,
  emptyAnswers,
  isBlankAnswers,
  isLastStep,
  makeDraft,
  nextStep,
  previousStep,
  resumeStep,
  stepProgress,
  type OnboardingAnswers,
  type OnboardingContext,
  type OnboardingStep,
} from "@/lib/onboarding/progress";
import { AccountStep } from "./onboarding/AccountStep";
import { BabyStep } from "./onboarding/BabyStep";
import { CodigoStep } from "./onboarding/CodigoStep";
import { DepartmentStep } from "./onboarding/DepartmentStep";
import { InviteStep } from "./onboarding/InviteStep";
import { AvisosStep } from "./onboarding/AvisosStep";
import { LmpStep } from "./onboarding/LmpStep";
import { ModeStep } from "./onboarding/ModeStep";
import { PerfilStep } from "./onboarding/PerfilStep";
import { RoleStep } from "./onboarding/RoleStep";

// BUILD-PLAN K1 (docs/archive/FABLE-PLAN-2026-08.md §3) — account-first onboarding.
//
// The flow is: mode → role → fecha → **tu situación** → departamento →
// **cuenta** → nombre del bebé → **invitá a tu pareja y familia**, with a
// second, much shorter path for somebody arriving on an invite: mode → role →
// cuenta → **código**. Three things about it are requirements rather than
// layout:
//
//  1. **The device row is written when the departamento step is left**, before
//     the account step can navigate the browser to Google. The account gate
//     admits verified users first; only a local-data test preview may create
//     these rows without a session.
//  2. **The step and every answer are persisted to localStorage** on each
//     change (`lib/onboarding/progress.ts`), so the OAuth round trip — which is
//     a full page load initiated by somebody else's server — resumes exactly
//     where it left off rather than dumping the user back at "¿Cómo querés
//     usar la app?" with everything retyped.
//  3. **Nobody is asked a question about a body they do not have** (K9-F5).
//     The invited path exists because a papá following his pareja's WhatsApp
//     link was being asked for the first day of his last menstruation, and
//     then for a department, before the app would show him anything.
//
// Personal tracking requires an account; public guides and emergency help
// stay open. Only explicitly configured local test previews can skip sign-in.
//
// This file is the machine, the persistence and the chrome. Each step's screen
// lives in `components/onboarding/` — K9-F5 split a 1,039-line file so that
// adding the two new steps did not make it 1,300.

type Step = OnboardingStep;

export function Onboarding({
  onDone,
  initialCode,
  initialSiteAnswers,
}: {
  onDone: () => void;
  /**
   * A code from `/?codigo=…`. Its presence also *starts* the invited flow:
   * somebody who opened the app from an invitation link has already answered
   * "¿cómo querés usar la app?" by tapping it.
   */
  initialCode?: string;
  /**
   * A prefill from the marketing site's deep link (SITE-PLAN-EMBARAZO-COM-PY.md
   * §5.3 — `?w=`, `?fpp=`, `?fum=`, `?modo=planeando`), already parsed by
   * `lib/onboarding/siteParams.ts`. Only *values* are prefilled — she still
   * walks through mode/role/date like anyone else, and can correct them.
   */
  initialSiteAnswers?: Partial<OnboardingAnswers>;
}) {
  const [answers, setAnswers] = useState<OnboardingAnswers>(emptyAnswers);
  const [hydrated, setHydrated] = useState(false);
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  const [dateError, setDateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const step = answers.step;
  const context: OnboardingContext = useMemo(
    () => ({
      mode: answers.mode,
      signedIn: auth?.signedIn ?? false,
      invited: answers.invited,
      role: answers.role,
    }),
    [answers.mode, answers.invited, answers.role, auth?.signedIn],
  );
  const progress = stepProgress(step, context);

  // Each step is swapped in place, not routed, so the browser keeps the
  // scroll offset of the step before — "Continuar" sits at the bottom, and
  // the next step (and, after "Empezar", Hoy itself) opened part-scrolled
  // with its heading under the sticky header.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // --- draft: restore once, then persist every change ----------------------

  useEffect(() => {
    const draft = readOnboardingDraft();
    if (draft) setAnswers(draftAnswers(draft));
    setHydrated(true);
  }, []);

  // A link with a code in it says what this person came to do. It only moves
  // somebody who has not started answering — a woman halfway through her own
  // onboarding who happens to open a friend's invitation must not have her
  // flow replaced underneath her.
  useEffect(() => {
    if (!hydrated || !initialCode) return;
    setAnswers((current) =>
      isBlankAnswers(current)
        ? { ...current, invited: true, step: "role" }
        : current,
    );
  }, [hydrated, initialCode]);

  // Same guard as the invite code above: a prefill from the site only ever
  // applies to a fresh flow, never on top of an in-progress one (including
  // one just started by an invite code, which is why this runs after it and
  // does not touch `step` or `invited`).
  useEffect(() => {
    if (!hydrated || !initialSiteAnswers) return;
    setAnswers((current) =>
      isBlankAnswers(current) ? { ...current, ...initialSiteAnswers } : current,
    );
  }, [hydrated, initialSiteAnswers]);

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
        invited: current.invited,
        role: current.role,
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
    setDateError("");
  }, []);

  const today = toDateInput(Date.now());
  // LMP can't be more than ~300 days ago or in the future.
  const minLmp = toDateInput(Date.now() - 300 * 86400000);

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

  // Hoy's "Semana nueva" card celebrates a week turning over. Right after
  // setup nothing has turned over — she has just told us her week — so the
  // week she starts in counts as already seen. Later weeks show as before.
  const markStartingWeekSeen = useRef<() => void>(() => {});
  markStartingWeekSeen.current = () => {
    if (answers.mode !== "embarazada" || answers.invited) return;
    const lmpDate = resolveLmpDate();
    if (lmpDate !== null && !Number.isNaN(lmpDate)) markWeekSeen(getCurrentWeek(lmpDate));
  };

  const goTo = useCallback(
    (target: Step | null) => {
      if (target === null) {
        markStartingWeekSeen.current();
        clearOnboardingDraft();
        window.scrollTo(0, 0);
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
    setAnswers((current) => ({ ...current, mode, invited: false, step: "role" }));
  }

  /**
   * "Me invitaron / tengo un código".
   *
   * Mode stays `embarazada`: a companion is following a pregnancy, not
   * planning one, and the mode is what the app switches on forever afterwards.
   * `invited` is the fact about *this run of onboarding* — it decides which
   * questions are absurd to ask — and it is not stored on the profile at all.
   */
  function chooseInvited() {
    setAnswers((current) => ({
      ...current,
      mode: "embarazada",
      invited: true,
      step: "role",
    }));
  }

  function chooseRole(role: Role) {
    setAnswers((current) => ({
      ...current,
      role,
      step: nextStep("role", { ...context, mode: current.mode, role })!,
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
   *
   * The invited path has no departamento step, so it calls this on leaving
   * `role` instead — for the same reason and with the same result: a companion
   * who abandons the flow at the account screen still has a profile row that
   * says who he is, and the app knows to show him a companion's home rather
   * than an empty pregnancy.
   */
  async function persistProfile(
    /**
     * Answers chosen in the same tap that triggered this write.
     *
     * The invited path persists on leaving `role`, and `setAnswers` has not
     * re-rendered by the time this runs — reading `answers.role` there would
     * store the role the user had *before* the button she just pressed.
     */
    override: Partial<OnboardingAnswers> = {},
  ): Promise<boolean> {
    const current = { ...answers, ...override };
    setSaving(true);
    setSaveError("");
    try {
      const now = Date.now();
      const lmpDate =
        current.mode === "embarazada" && !current.invited ? resolveLmpDate() : null;

      if (lmpDate !== null) {
        const existing = (await db().pregnancy.toArray())[0];
        const fields = {
          lmpDate,
          dueDate: getDueDate(lmpDate),
          method: current.method,
        };
        if (existing?.id) await db().pregnancy.update(existing.id, fields);
        else await db().pregnancy.add({ ...fields, createdAt: now });
      }

      const existingProfile = (await db().profile.toArray())[0];
      const fields = {
        // An invited companion was never asked, and `undefined` is the honest
        // answer — not the empty string, which would render as a department
        // filter that matches nothing.
        department: current.department || undefined,
        city: current.city.trim() || undefined,
        mode: current.mode,
        role: current.role,
        // K9-F5. Absent stays absent: `answeredProfileFields` turns a skipped
        // question into `undefined` rather than into a default.
        ...answeredProfileFields(current),
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

  async function continueFromRole(role: Role) {
    if (!answers.invited) {
      chooseRole(role);
      return;
    }
    setAnswers((prev) => ({ ...prev, role }));
    // The invited flow skips departamento, so this is where the row lands.
    // A failed write still moves on: the message is shown, and the account
    // step is not where somebody should be stuck re-tapping "papá".
    await persistProfile({ role });
    goTo(nextStep("role", { ...context, role }));
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
      {/* The full welcome is for the first question. After it, the heading
          steps back so each question sits near the top of a phone screen,
          and a count says how much is left. */}
      <div className={step === "mode" ? "mb-6 text-center" : "mb-4 text-center"}>
        <h1
          className={
            step === "mode"
              ? "text-2xl font-black tracking-tight text-ink"
              : "text-base font-extrabold tracking-tight text-ink"
          }
        >
          {/* Before a role is picked the reader is almost always the mamá;
              after "Papá" or "Familiar", "Bienvenida" is the wrong person. */}
          {answers.role && answers.role !== "mama"
            ? `Te damos la bienvenida a ${APP_NAME}`
            : `Bienvenida a ${APP_NAME}`}
        </h1>
        {step === "mode" ? (
          <p className="mt-2 text-sm text-muted">
            Tu embarazo y tu familia, en una sola app — hecha para Paraguay.
          </p>
        ) : progress ? (
          <div className="mx-auto mt-2 max-w-[16rem]">
            <p className="text-xs font-bold text-muted">
              Paso {progress.current} de {progress.total}
            </p>
            <div
              role="progressbar"
              aria-label="Avance de la configuración"
              aria-valuemin={1}
              aria-valuemax={progress.total}
              aria-valuenow={progress.current}
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"
            >
              <div
                className="h-full rounded-full bg-petrol transition-[width] motion-reduce:transition-none"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {step === "mode" && (
        <ModeStep onChoose={chooseMode} onInvited={chooseInvited} />
      )}

      {step === "role" && (
        <RoleStep
          invited={answers.invited}
          onChoose={(role) => void continueFromRole(role)}
          onBack={goBack}
        />
      )}

      {step === "lmp" && (
        <LmpStep
          answers={answers}
          error={dateError}
          today={today}
          minLmp={minLmp}
          canContinue={canContinueFromLmp()}
          resolvedLmp={resolveLmpDate()}
          onChange={update}
          onContinue={continueFromLmp}
          onBack={goBack}
        />
      )}

      {step === "perfil" && (
        <PerfilStep
          answers={answers}
          onChange={update}
          onContinue={() => goTo(nextStep("perfil", context))}
          onBack={goBack}
        />
      )}

      {step === "department" && (
        <DepartmentStep
          answers={answers}
          saving={saving}
          error={saveError}
          onChange={update}
          onContinue={() => void continueFromDepartment()}
          onBack={goBack}
        />
      )}

      {step === "cuenta" && (
        <AccountStep
          auth={auth}
          isLast={isLastStep("cuenta", context)}
          invited={answers.invited}
          onSkip={() => goTo(nextStep("cuenta", { ...context, signedIn: false }))}
          onContinue={() => goTo(nextStep("cuenta", context))}
          onBack={goBack}
        />
      )}

      {step === "codigo" && (
        <CodigoStep
          auth={auth}
          initialCode={initialCode}
          onDone={() => goTo(null)}
          onBack={goBack}
        />
      )}

      {step === "bebe" && (
        <BabyStep
          answers={answers}
          saving={saving}
          isLast={isLastStep("bebe", context)}
          onChange={update}
          onContinue={() => void continueFromBabyName()}
          onBack={goBack}
        />
      )}

      {step === "invitar" && (
        <InviteStep onFinish={() => goTo(nextStep("invitar", context))} onBack={goBack} />
      )}

      {step === "avisos" && (
        <AvisosStep onFinish={() => goTo(null)} onBack={goBack} />
      )}

      {saveError && step !== "department" && (
        <p className="mt-3 px-1 text-sm text-terracotta">{saveError}</p>
      )}

      {/* What the account does for her, where it is relevant: on the first
          screen and next to the account step, not under every question. */}
      {(step === "mode" || step === "cuenta") && (
        <div className="mt-6 rounded-card border border-sage/30 bg-sage/5 p-4">
          <p className="text-xs leading-relaxed text-muted">
            Tu cuenta permite recuperar tus registros cuando cambiás de teléfono.
            Podés borrar tu cuenta y sus datos desde Ajustes. Tus notas no se
            comparten con tu familia. Tus fotos solo se respaldan si activás su copia.
          </p>
        </div>
      )}

      <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-muted">
        {APP_NAME} es informativo y no reemplaza la atención de un profesional de la
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
