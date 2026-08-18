import { describe, it, expect } from "vitest";

import { ROLE_ORDER } from "@/lib/roleCopy";
import {
  ONBOARDING_DRAFT_TTL_MS,
  ONBOARDING_STEPS,
  ROLE_VALUES,
  decodeDraft,
  emptyAnswers,
  emptyDraft,
  encodeDraft,
  isBlankAnswers,
  isLastStep,
  makeDraft,
  nextStep,
  previousStep,
  resumeStep,
  stepsFor,
  type OnboardingDraft,
} from "./progress";

// BUILD-PLAN K1. The flow is asserted here rather than in the component because
// the property that matters — "signing in mid-onboarding resumes where it left
// off" — is a property of the machine and the draft, not of a React tree.

const NOW = 1_760_000_000_000;

describe("stepsFor", () => {
  it("walks an embarazada with an account through every step", () => {
    expect(stepsFor({ mode: "embarazada", signedIn: true })).toEqual([
      "mode",
      "role",
      "lmp",
      "department",
      "cuenta",
      "bebe",
      "invitar",
    ]);
  });

  it("does not offer an invite step to somebody with no account", () => {
    // An invite code is a server object. Showing the step to a local-only user
    // would be the dead end K1 exists to remove.
    expect(stepsFor({ mode: "embarazada", signedIn: false })).not.toContain(
      "invitar",
    );
  });

  it("skips the pregnancy-only steps in planeando mode", () => {
    const steps = stepsFor({ mode: "planeando", signedIn: true });
    expect(steps).toEqual(["mode", "role", "department", "cuenta"]);
  });

  it("always offers the account step, in both modes and both states", () => {
    for (const mode of ["embarazada", "planeando"] as const) {
      for (const signedIn of [true, false]) {
        expect(stepsFor({ mode, signedIn })).toContain("cuenta");
      }
    }
  });
});

describe("nextStep / previousStep", () => {
  const context = { mode: "embarazada", signedIn: false } as const;

  it("ends the flow after the last step", () => {
    expect(nextStep("bebe", context)).toBeNull();
    expect(isLastStep("bebe", context)).toBe(true);
  });

  it("moves the account step's successor when an account appears", () => {
    expect(nextStep("bebe", { mode: "embarazada", signedIn: true })).toBe(
      "invitar",
    );
    expect(isLastStep("bebe", { mode: "embarazada", signedIn: true })).toBe(false);
  });

  it("returns null before the first step rather than wrapping around", () => {
    expect(previousStep("mode", context)).toBeNull();
  });

  it("steps back over a skipped step", () => {
    // "planeando" has no lmp step, so going back from department reaches role.
    expect(previousStep("department", { mode: "planeando", signedIn: false })).toBe(
      "role",
    );
    expect(previousStep("department", context)).toBe("lmp");
  });

  it("walks the whole flow forwards and back to the start", () => {
    const ctx = { mode: "embarazada", signedIn: true } as const;
    const walked: string[] = [];
    let step: ReturnType<typeof nextStep> = "mode";
    while (step) {
      walked.push(step);
      step = nextStep(step, ctx);
    }
    expect(walked).toEqual(stepsFor(ctx));
  });
});

describe("resumeStep", () => {
  it("keeps a step that still exists", () => {
    expect(resumeStep("cuenta", { mode: "embarazada", signedIn: false })).toBe(
      "cuenta",
    );
  });

  it("falls back to the nearest earlier step when the flow changed", () => {
    // Recorded on a pregnancy flow, resumed after switching to planeando: there
    // is no `bebe` step any more, and `cuenta` is the last one before it.
    expect(resumeStep("bebe", { mode: "planeando", signedIn: false })).toBe(
      "cuenta",
    );
    expect(resumeStep("lmp", { mode: "planeando", signedIn: false })).toBe("role");
  });

  it("never returns a step outside the flow", () => {
    for (const step of ONBOARDING_STEPS) {
      for (const mode of ["embarazada", "planeando"] as const) {
        for (const signedIn of [true, false]) {
          const resumed = resumeStep(step, { mode, signedIn });
          expect(stepsFor({ mode, signedIn })).toContain(resumed);
        }
      }
    }
  });
});

describe("isBlankAnswers", () => {
  it("is true for a flow nobody has touched", () => {
    expect(isBlankAnswers(emptyAnswers())).toBe(true);
  });

  it("is false the moment anything is answered", () => {
    // Each of these is a thing a user would be upset to retype after being sent
    // to Google and back.
    for (const patch of [
      { step: "role" as const },
      { mode: "planeando" as const },
      { role: "papa" as const },
      { lmp: "2026-03-01" },
      { department: "capital" },
      { city: "Luque" },
      { babyName: "Silvia" },
      { profileSaved: true },
    ]) {
      expect(isBlankAnswers({ ...emptyAnswers(), ...patch }), JSON.stringify(patch)).toBe(
        false,
      );
    }
  });
});

describe("the draft", () => {
  const draft: OnboardingDraft = {
    ...emptyDraft(NOW),
    step: "cuenta",
    mode: "embarazada",
    role: "mama",
    lmp: "2026-03-01",
    department: "capital",
    profileSaved: true,
  };

  it("round-trips through storage", () => {
    expect(decodeDraft(encodeDraft(draft), NOW)).toEqual(draft);
  });

  it("survives the OAuth round trip — the answers come back, not just the step", () => {
    const restored = decodeDraft(encodeDraft(draft), NOW + 90_000)!;
    expect(restored.step).toBe("cuenta");
    expect(restored.lmp).toBe("2026-03-01");
    expect(restored.department).toBe("capital");
    expect(restored.profileSaved).toBe(true);
  });

  it("refuses anything it did not write", () => {
    expect(decodeDraft(null, NOW)).toBeNull();
    expect(decodeDraft("", NOW)).toBeNull();
    expect(decodeDraft("not json", NOW)).toBeNull();
    expect(decodeDraft("[]", NOW)).toBeNull();
    expect(decodeDraft(JSON.stringify({ ...draft, version: 2 }), NOW)).toBeNull();
    expect(decodeDraft(JSON.stringify({ ...draft, step: "wat" }), NOW)).toBeNull();
    expect(decodeDraft(JSON.stringify({ ...draft, role: "tia" }), NOW)).toBeNull();
    expect(decodeDraft(JSON.stringify({ ...draft, extra: 1 }), NOW)).toBeNull();
  });

  it("expires, and refuses a timestamp from the future", () => {
    const old = makeDraft(draft, NOW - ONBOARDING_DRAFT_TTL_MS - 1);
    expect(decodeDraft(encodeDraft(old), NOW)).toBeNull();

    const justInside = makeDraft(draft, NOW - ONBOARDING_DRAFT_TTL_MS + 1);
    expect(decodeDraft(encodeDraft(justInside), NOW)).not.toBeNull();

    // A clock that moved backwards would otherwise pin a draft forever.
    expect(decodeDraft(encodeDraft(makeDraft(draft, NOW + 1)), NOW)).toBeNull();
  });

  it("offers every role the app offers", () => {
    // Onboarding is where the role is chosen; a role missing here could never
    // be picked at all.
    expect([...ROLE_VALUES].sort()).toEqual([...ROLE_ORDER].sort());
  });

  it("carries no health data beyond the answers onboarding asked for", () => {
    // The draft lives in localStorage, which the PIN never encrypts. It may
    // hold what the user just typed into this flow and nothing else — no notes,
    // no symptoms, nothing pulled out of Dexie.
    expect(Object.keys(emptyDraft(NOW)).sort()).toEqual(
      [
        "babyName",
        "city",
        "conceptionDateInput",
        "department",
        "dueDateInput",
        "fivEmbryoDay",
        "fivTransferDate",
        "lmp",
        "method",
        "mode",
        "profileSaved",
        "role",
        "step",
        "updatedAt",
        "version",
      ].sort(),
    );
  });
});
