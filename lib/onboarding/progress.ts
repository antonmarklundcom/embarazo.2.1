import { z } from "zod";

import type { AppMode, Role } from "@/lib/db";

// BUILD-PLAN K1 (docs/FABLE-PLAN-2026-08.md §3) — the account-first onboarding
// flow, as data.
//
// This file is pure on purpose. The flow now contains a step that navigates the
// browser away to Google and back (`cuenta`), which means the answers collected
// so far have to survive a full page load initiated by somebody else's server.
// A step machine that lives only in `useState` cannot do that, so the machine
// and the draft it serialises are separated from the component and unit-tested
// here: "signing in mid-onboarding resumes where it left off" is then a
// property of a function rather than of a React tree nobody can assert about.
//
// Nothing in this module touches `window`; `lib/onboarding/draftStorage.ts` is
// the only place that reads or writes localStorage.

export const ONBOARDING_STEPS = [
  "mode",
  "role",
  "lmp",
  "department",
  "cuenta",
  "bebe",
  "invitar",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * What the flow needs to know to decide which steps exist.
 *
 * `signedIn` is part of the *shape* of the flow, not only of one screen: a user
 * with no account has nobody to invite, and showing them an invite step they
 * cannot use would be the "dead end" K1 exists to remove.
 */
export interface OnboardingContext {
  mode: AppMode;
  signedIn: boolean;
}

/**
 * The steps this user actually walks through, in order.
 *
 * - `lmp` is pregnancy-only: "planeando" has no gestational date to ask for.
 * - `bebe` is pregnancy-only for the same reason — there is no baby to name yet.
 * - `invitar` needs an account, because an invite code is a server object.
 */
export function stepsFor(context: OnboardingContext): OnboardingStep[] {
  const pregnant = context.mode === "embarazada";
  return ONBOARDING_STEPS.filter((step) => {
    if (step === "lmp") return pregnant;
    if (step === "bebe") return pregnant;
    if (step === "invitar") return pregnant && context.signedIn;
    return true;
  });
}

/** The next step, or `null` when this was the last one (i.e. finish). */
export function nextStep(
  step: OnboardingStep,
  context: OnboardingContext,
): OnboardingStep | null {
  const steps = stepsFor(context);
  const index = steps.indexOf(step);
  if (index === -1) return steps[0] ?? null;
  return steps[index + 1] ?? null;
}

/** The previous step, or `null` when this was the first one. */
export function previousStep(
  step: OnboardingStep,
  context: OnboardingContext,
): OnboardingStep | null {
  const steps = stepsFor(context);
  const index = steps.indexOf(step);
  if (index <= 0) return null;
  return steps[index - 1] ?? null;
}

export function isLastStep(
  step: OnboardingStep,
  context: OnboardingContext,
): boolean {
  return nextStep(step, context) === null;
}

/**
 * The step a resumed draft should land on.
 *
 * A draft can name a step that no longer exists for this user — she signed in
 * on the `cuenta` step, which added `invitar`, or she went back and switched to
 * "planeando", which removed `lmp`. Landing on a step that is not in the flow
 * would render nothing at all, so an unknown step falls back to the last step
 * that *is* in the flow and comes no later than the recorded one.
 */
export function resumeStep(
  step: OnboardingStep,
  context: OnboardingContext,
): OnboardingStep {
  const steps = stepsFor(context);
  if (steps.includes(step)) return step;
  const recorded = ONBOARDING_STEPS.indexOf(step);
  const earlier = steps.filter(
    (candidate) => ONBOARDING_STEPS.indexOf(candidate) <= recorded,
  );
  return earlier[earlier.length - 1] ?? steps[0]!;
}

// ---------------------------------------------------------------------------
// The draft
// ---------------------------------------------------------------------------

export const ONBOARDING_DRAFT_KEY = "mibebe:onboarding:v1";

/**
 * How long an abandoned draft is honoured.
 *
 * Long enough that "I started this last night and my phone died" resumes, short
 * enough that a half-answered flow from a month ago does not ambush somebody
 * who has since decided to just use the app.
 */
export const ONBOARDING_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The role and mode values the draft may carry.
 *
 * `satisfies` rather than a bare literal list: a value that stops being a
 * `Role` in lib/db.ts fails the build here instead of silently making every
 * stored draft unparseable at runtime. Exhaustiveness (every `Role` is
 * offered) is asserted in progress.test.ts against `ROLE_ORDER`.
 */
const ROLE_VALUES = [
  "mama",
  "papa",
  "acompanante",
  "familiar",
] as const satisfies readonly Role[];

const MODE_VALUES = ["embarazada", "planeando"] as const satisfies readonly AppMode[];

const DraftSchema = z
  .object({
    version: z.literal(1),
    step: z.enum(ONBOARDING_STEPS),
    mode: z.enum(MODE_VALUES),
    role: z.enum(ROLE_VALUES),
    method: z.enum(["lmp", "ecografia", "fiv", "conception"]),
    lmp: z.string().max(20),
    dueDateInput: z.string().max(20),
    fivTransferDate: z.string().max(20),
    fivEmbryoDay: z.union([z.literal(3), z.literal(5)]),
    conceptionDateInput: z.string().max(20),
    department: z.string().max(64),
    city: z.string().max(120),
    babyName: z.string().max(64),
    /**
     * Whether the profile has already been written to IndexedDB.
     *
     * The device row is written when the department step is left — *before* the
     * sign-in redirect — so a user who never comes back from Google still has a
     * working app. This flag is what stops the later steps writing a second
     * profile row on top of it.
     */
    profileSaved: z.boolean(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export type OnboardingDraft = z.infer<typeof DraftSchema>;

export { ROLE_VALUES, MODE_VALUES };

export type OnboardingAnswers = Omit<OnboardingDraft, "version" | "updatedAt">;

export function emptyAnswers(): OnboardingAnswers {
  return {
    step: "mode",
    mode: "embarazada",
    role: "mama",
    method: "lmp",
    lmp: "",
    dueDateInput: "",
    fivTransferDate: "",
    fivEmbryoDay: 5,
    conceptionDateInput: "",
    department: "",
    city: "",
    babyName: "",
    profileSaved: false,
  };
}

export function emptyDraft(now: number): OnboardingDraft {
  return makeDraft(emptyAnswers(), now);
}

/**
 * Has this user answered anything yet?
 *
 * A draft is written only once there is something to lose. That is not tidiness
 * — it is what keeps "there is an onboarding in progress on this device" a
 * question with a true answer. A second device that signs in and syncs a
 * profile down opens onboarding for a moment before the pull lands; if merely
 * rendering the first screen wrote a draft, that device would be stuck in a
 * flow it never started.
 */
export function isBlankAnswers(answers: OnboardingAnswers): boolean {
  const blank = emptyAnswers();
  return (
    Object.keys(blank) as (keyof OnboardingAnswers)[]
  ).every((key) => answers[key] === blank[key]);
}

export function makeDraft(
  answers: OnboardingAnswers,
  now: number,
): OnboardingDraft {
  return { ...answers, version: 1, updatedAt: now };
}

/** The answers half of a stored draft, ready to drop into component state. */
export function draftAnswers(draft: OnboardingDraft): OnboardingAnswers {
  return {
    step: draft.step,
    mode: draft.mode,
    role: draft.role,
    method: draft.method,
    lmp: draft.lmp,
    dueDateInput: draft.dueDateInput,
    fivTransferDate: draft.fivTransferDate,
    fivEmbryoDay: draft.fivEmbryoDay,
    conceptionDateInput: draft.conceptionDateInput,
    department: draft.department,
    city: draft.city,
    babyName: draft.babyName,
    profileSaved: draft.profileSaved,
  };
}

export function encodeDraft(draft: OnboardingDraft): string {
  return JSON.stringify(draft);
}

/**
 * Parse a stored draft, or return null.
 *
 * Everything is a reason to return null: a bad shape, an old version, an
 * expired timestamp, a timestamp from the future (a clock that moved backwards
 * would otherwise pin a draft forever). The caller's fallback is "start
 * onboarding from the top", which is always a working state — so this function
 * never throws and never half-trusts what it read.
 */
export function decodeDraft(
  raw: string | null | undefined,
  now: number,
): OnboardingDraft | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = DraftSchema.safeParse(parsed);
  if (!result.success) return null;
  const { updatedAt } = result.data;
  if (updatedAt > now) return null;
  if (now - updatedAt > ONBOARDING_DRAFT_TTL_MS) return null;
  return result.data;
}
