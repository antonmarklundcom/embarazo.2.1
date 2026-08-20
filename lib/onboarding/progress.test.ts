import { describe, it, expect } from "vitest";

import { ROLE_ORDER } from "@/lib/roleCopy";
import { CARE_SETTINGS } from "./personalisation";
import { WORK_SITUATIONS } from "@/lib/derechos";
import {
  CARE_SETTING_VALUES,
  WORK_SITUATION_VALUES,
  ONBOARDING_DRAFT_TTL_MS,
  ONBOARDING_STEPS,
  ROLE_VALUES,
  answeredProfileFields,
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
  type OnboardingContext,
  type OnboardingDraft,
} from "./progress";

// BUILD-PLAN K1. The flow is asserted here rather than in the component because
// the property that matters — "signing in mid-onboarding resumes where it left
// off" — is a property of the machine and the draft, not of a React tree.

const NOW = 1_760_000_000_000;

/**
 * A context, with K9-F5's two new fields defaulted to "the flow as it was".
 *
 * The helper exists so that adding a field to `OnboardingContext` amends the
 * assertions rather than rewriting every call site — and so that a test which
 * cares about `invited` or `role` says so out loud instead of carrying it in a
 * literal nobody reads.
 */
function ctx(
  over: Partial<OnboardingContext> & Pick<OnboardingContext, "mode" | "signedIn">,
): OnboardingContext {
  return { invited: false, role: "mama", ...over };
}

describe("stepsFor", () => {
  it("walks an embarazada with an account through every step", () => {
    expect(stepsFor(ctx({ mode: "embarazada", signedIn: true }))).toEqual([
      "mode",
      "role",
      "lmp",
      "perfil",
      "department",
      "cuenta",
      "bebe",
      "invitar",
    ]);
  });

  it("does not offer an invite step to somebody with no account", () => {
    // An invite code is a server object. Showing the step to a local-only user
    // would be the dead end K1 exists to remove.
    expect(stepsFor(ctx({ mode: "embarazada", signedIn: false }))).not.toContain(
      "invitar",
    );
  });

  it("skips the pregnancy-only steps in planeando mode", () => {
    const steps = stepsFor(ctx({ mode: "planeando", signedIn: true }));
    expect(steps).toEqual(["mode", "role", "department", "cuenta"]);
  });

  it("always offers the account step, in both modes and both states", () => {
    for (const mode of ["embarazada", "planeando"] as const) {
      for (const signedIn of [true, false]) {
        expect(stepsFor(ctx({ mode, signedIn }))).toContain("cuenta");
      }
    }
  });
});

describe("nextStep / previousStep", () => {
  const context = ctx({ mode: "embarazada", signedIn: false });

  it("ends the flow after the last step", () => {
    expect(nextStep("bebe", context)).toBeNull();
    expect(isLastStep("bebe", context)).toBe(true);
  });

  it("moves the account step's successor when an account appears", () => {
    expect(nextStep("bebe", ctx({ mode: "embarazada", signedIn: true }))).toBe(
      "invitar",
    );
    expect(isLastStep("bebe", ctx({ mode: "embarazada", signedIn: true }))).toBe(false);
  });

  it("returns null before the first step rather than wrapping around", () => {
    expect(previousStep("mode", context)).toBeNull();
  });

  it("steps back over a skipped step", () => {
    // "planeando" has no lmp step, so going back from department reaches role.
    expect(previousStep("department", ctx({ mode: "planeando", signedIn: false }))).toBe(
      "role",
    );
    expect(previousStep("department", context)).toBe("perfil");
    // ...and over `perfil` too, for a papá, who is never asked it.
    expect(
      previousStep("department", ctx({ mode: "embarazada", signedIn: false, role: "papa" })),
    ).toBe("lmp");
  });

  it("walks the whole flow forwards and back to the start", () => {
    const context = ctx({ mode: "embarazada", signedIn: true });
    const walked: string[] = [];
    let step: ReturnType<typeof nextStep> = "mode";
    while (step) {
      walked.push(step);
      step = nextStep(step, context);
    }
    expect(walked).toEqual(stepsFor(context));
  });
});

describe("resumeStep", () => {
  it("keeps a step that still exists", () => {
    expect(resumeStep("cuenta", ctx({ mode: "embarazada", signedIn: false }))).toBe(
      "cuenta",
    );
  });

  it("falls back to the nearest earlier step when the flow changed", () => {
    // Recorded on a pregnancy flow, resumed after switching to planeando: there
    // is no `bebe` step any more, and `cuenta` is the last one before it.
    expect(resumeStep("bebe", ctx({ mode: "planeando", signedIn: false }))).toBe(
      "cuenta",
    );
    expect(resumeStep("lmp", ctx({ mode: "planeando", signedIn: false }))).toBe("role");
  });

  it("never returns a step outside the flow", () => {
    for (const step of ONBOARDING_STEPS) {
      for (const mode of ["embarazada", "planeando"] as const) {
        for (const signedIn of [true, false]) {
          for (const invited of [true, false]) {
            for (const role of ROLE_ORDER) {
              const context = ctx({ mode, signedIn, invited, role });
              expect(stepsFor(context)).toContain(resumeStep(step, context));
            }
          }
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
      { invited: true },
      { firstPregnancy: "si" as const },
      { careSetting: "ips" as const },
      { workSituation: "sin-ips" as const },
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
        "careSetting",
        "city",
        "conceptionDateInput",
        "department",
        "dueDateInput",
        "firstPregnancy",
        "fivEmbryoDay",
        "fivTransferDate",
        "invited",
        "lmp",
        "method",
        "mode",
        "profileSaved",
        "role",
        "step",
        "updatedAt",
        "version",
        "workSituation",
      ].sort(),
    );
    // K9-F5 added three of those. They are health-adjacent — "primer embarazo"
    // and "dónde te atendés" say something about her — and they sit in
    // localStorage in the clear. That is the same standing `lmp` has had since
    // K1, and `lmp` is the more revealing of the two: the rule this test
    // enforces is "what she just typed into this flow, and nothing else", not
    // "nothing sensitive". The draft is deleted the moment the flow ends.
  });
});

// ---------------------------------------------------------------------------
// K9-F5
// ---------------------------------------------------------------------------

describe("the invited flow", () => {
  const invited = ctx({ mode: "embarazada", signedIn: true, invited: true, role: "papa" });

  it("asks a companion nothing about a body he does not have", () => {
    // The bug this fixes: a papá following the link his pareja sent him was
    // asked for the first day of his last menstruation.
    expect(stepsFor(invited)).toEqual(["mode", "role", "cuenta", "codigo"]);
  });

  it("puts the code step after the account step, never before", () => {
    // Redeeming an invite is a server call made as somebody. There is no
    // anonymous way to join a pregnancy, so an earlier code step would be a
    // screen that can only fail.
    const steps = stepsFor(invited);
    expect(steps.indexOf("codigo")).toBeGreaterThan(steps.indexOf("cuenta"));
    expect(isLastStep("codigo", invited)).toBe(true);
  });

  it("still offers the code step to somebody who has not signed in yet", () => {
    // She may sign in *on* the account step; dropping the code step for a
    // signed-out context would delete the destination she came for.
    expect(stepsFor({ ...invited, signedIn: false })).toContain("codigo");
  });

  it("never shows the code step to somebody who was not invited", () => {
    for (const mode of ["embarazada", "planeando"] as const) {
      for (const signedIn of [true, false]) {
        expect(stepsFor(ctx({ mode, signedIn }))).not.toContain("codigo");
      }
    }
  });
});

describe("the perfil step", () => {
  it("is asked of the pregnant woman herself", () => {
    expect(stepsFor(ctx({ mode: "embarazada", signedIn: false }))).toContain(
      "perfil",
    );
  });

  it("is not asked of anybody else", () => {
    // The three answers personalise *her* derechos, *her* checklist and *her*
    // reading. A papá's answer would be applied to the wrong person.
    for (const role of ROLE_ORDER.filter((r) => r !== "mama")) {
      expect(
        stepsFor(ctx({ mode: "embarazada", signedIn: true, role })),
      ).not.toContain("perfil");
    }
    expect(stepsFor(ctx({ mode: "planeando", signedIn: true }))).not.toContain(
      "perfil",
    );
    expect(
      stepsFor(ctx({ mode: "embarazada", signedIn: true, invited: true })),
    ).not.toContain("perfil");
  });
});

describe("answeredProfileFields", () => {
  it("turns a skipped answer into absence, never into a default", () => {
    // `false` is an answer. A woman who skipped "¿es tu primer embarazo?" must
    // land exactly where she would have before this feature existed.
    expect(answeredProfileFields(emptyAnswers())).toEqual({
      firstPregnancy: undefined,
      careSetting: undefined,
      workSituation: undefined,
    });
  });

  it("carries every answer through", () => {
    expect(
      answeredProfileFields({
        ...emptyAnswers(),
        firstPregnancy: "no",
        careSetting: "privado",
        workSituation: "sin-ips",
      }),
    ).toEqual({
      firstPregnancy: false,
      careSetting: "privado",
      workSituation: "sin-ips",
    });
    expect(
      answeredProfileFields({ ...emptyAnswers(), firstPregnancy: "si" }).firstPregnancy,
    ).toBe(true);
  });

  it("offers every value its target type has", () => {
    expect([...CARE_SETTING_VALUES].sort()).toEqual(
      CARE_SETTINGS.map((c) => c.key).sort(),
    );
    expect([...WORK_SITUATION_VALUES].sort()).toEqual(
      WORK_SITUATIONS.map((w) => w.key).sort(),
    );
  });
});
