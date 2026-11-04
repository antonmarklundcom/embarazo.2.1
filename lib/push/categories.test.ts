import { describe, expect, it } from "vitest";

import {
  DEFAULT_CATEGORIES,
  OFFERED_CATEGORY_INFO,
  ONBOARDING_CATEGORIES,
  PUSH_CATEGORIES,
  PUSH_CATEGORY_INFO,
  acceptsCategory,
  normaliseCategories,
  toggleCategory,
} from "./categories";

// BUILD-PLAN B5: "each category can be turned off independently".

describe("the category vocabulary", () => {
  it("matches the documented one (FEATURE-MAP #7)", () => {
    expect(PUSH_CATEGORIES).toEqual([
      "consejos",
      "recordatorios",
      "avisos",
      // PR-5b. A cheer from her pareja was landing silently; `mimos` is the
      // opt-in that lets it poke her, and lets her turn it off on its own
      // rather than by giving up notifications entirely.
      "mimos",
    ]);
  });

  it("describes every category it offers", () => {
    expect(PUSH_CATEGORY_INFO.map((c) => c.key).sort()).toEqual(
      [...PUSH_CATEGORIES].sort(),
    );
    for (const category of PUSH_CATEGORY_INFO) {
      expect(category.label.length).toBeGreaterThan(0);
      expect(category.description.length).toBeGreaterThan(10);
    }
  });

  it("defaults to control reminders only", () => {
    // The ones a user loses something by missing. Defaulting weekly tips on is
    // how an app gets its notifications turned off entirely and permanently.
    // A prenatal control, and a message a person deliberately sent her.
    // Neither can become noise; a weekly tip nobody asked for can.
    expect(DEFAULT_CATEGORIES).toEqual(["recordatorios", "mimos"]);
    expect(DEFAULT_CATEGORIES).not.toContain("consejos");
  });
});

describe("normaliseCategories", () => {
  it("drops anything it does not recognise", () => {
    expect(normaliseCategories(["recordatorios", "publicidad"])).toEqual([
      "recordatorios",
    ]);
  });

  it("de-duplicates and returns display order", () => {
    expect(
      normaliseCategories(["avisos", "recordatorios", "avisos"]),
    ).toEqual(["recordatorios", "avisos"]);
  });

  it("accepts an empty list — that is 'everything off', not 'use defaults'", () => {
    expect(normaliseCategories([])).toEqual([]);
  });
});

describe("toggleCategory", () => {
  it("turns one off without touching the others", () => {
    const result = toggleCategory(
      ["recordatorios", "consejos", "avisos"],
      "consejos",
      false,
    );
    expect(result).toEqual(["recordatorios", "avisos"]);
  });

  it("turns one on without touching the others", () => {
    expect(toggleCategory(["recordatorios"], "avisos", true)).toEqual([
      "recordatorios",
      "avisos",
    ]);
  });

  it("is idempotent", () => {
    expect(toggleCategory(["recordatorios"], "recordatorios", true)).toEqual([
      "recordatorios",
    ]);
    expect(toggleCategory(["recordatorios"], "consejos", false)).toEqual([
      "recordatorios",
    ]);
  });

  it("can turn everything off", () => {
    let current = [...DEFAULT_CATEGORIES];
    for (const category of PUSH_CATEGORIES) {
      current = toggleCategory(current, category, false);
    }
    expect(current).toEqual([]);
  });
});

describe("acceptsCategory", () => {
  it("is what the server checks before sending", () => {
    // Enforced at send time, not only in the UI: a toggle that merely hides a
    // notification the phone already received is not an opt-out.
    expect(acceptsCategory(["recordatorios"], "recordatorios")).toBe(true);
    expect(acceptsCategory(["recordatorios"], "consejos")).toBe(false);
    expect(acceptsCategory([], "recordatorios")).toBe(false);
  });

  it("ignores junk stored against a subscription", () => {
    expect(acceptsCategory(["publicidad"], "recordatorios")).toBe(false);
  });
});

describe("what is offered, and where consejos is pre-selected", () => {
  it("keeps `consejos` off for a generic opt-in from Ajustes", () => {
    expect(PUSH_CATEGORY_INFO.find((c) => c.key === "consejos")?.defaultOn).toBe(false);
  });

  it("pre-selects `consejos` in the onboarding Avisos step, next to the defaults", () => {
    expect(ONBOARDING_CATEGORIES).toEqual(["recordatorios", "consejos", "mimos"]);
    for (const key of DEFAULT_CATEGORIES) expect(ONBOARDING_CATEGORIES).toContain(key);
  });

  it("hides `avisos` (no sender exists) but keeps it in the contract", () => {
    expect(OFFERED_CATEGORY_INFO.map((c) => c.key)).toEqual(["recordatorios", "consejos", "mimos"]);
    expect(PUSH_CATEGORIES).toContain("avisos");
    expect(ONBOARDING_CATEGORIES).not.toContain("avisos");
    // A stored opt-in survives normalisation and unrelated toggles.
    expect(normaliseCategories(["avisos"])).toEqual(["avisos"]);
    expect(toggleCategory(["avisos"], "consejos", true)).toEqual(["consejos", "avisos"]);
  });
});
