import { describe, expect, it } from "vitest";
import {
  babyAtWeekLabel,
  isSelfCentered,
  moodCheckInLabel,
  pregnancyPossessive,
  pregnancyPossessiveCap,
  ROLE_LABELS,
  ROLE_ONBOARDING_COPY,
} from "./roleCopy";
import type { Role } from "./db";

const ROLES: Role[] = ["mama", "papa", "acompanante", "familiar"];

describe("isSelfCentered", () => {
  it("is true for mama and for an unset role (back-compat default)", () => {
    expect(isSelfCentered("mama")).toBe(true);
    expect(isSelfCentered(undefined)).toBe(true);
  });

  it("is false for every other role", () => {
    expect(isSelfCentered("papa")).toBe(false);
    expect(isSelfCentered("acompanante")).toBe(false);
    expect(isSelfCentered("familiar")).toBe(false);
  });
});

describe("pregnancyPossessive / pregnancyPossessiveCap", () => {
  it("uses tu/Tu for mama", () => {
    expect(pregnancyPossessive("mama")).toBe("tu");
    expect(pregnancyPossessiveCap("mama")).toBe("Tu");
  });

  it("uses su/Su for every non-mama role", () => {
    for (const role of ["papa", "acompanante", "familiar"] as const) {
      expect(pregnancyPossessive(role)).toBe("su");
      expect(pregnancyPossessiveCap(role)).toBe("Su");
    }
  });
});

describe("babyAtWeekLabel", () => {
  it("says Tu bebé for mama", () => {
    expect(babyAtWeekLabel("mama", 24)).toBe("Tu bebé a las 24 semanas");
  });

  it("says El bebé for accompanying roles", () => {
    expect(babyAtWeekLabel("papa", 24)).toBe("El bebé a las 24 semanas");
    expect(babyAtWeekLabel("acompanante", 10)).toBe("El bebé a las 10 semanas");
    expect(babyAtWeekLabel("familiar", 1)).toBe("El bebé a las 1 semanas");
  });
});

describe("moodCheckInLabel", () => {
  it("asks the mamá about herself in second person", () => {
    expect(moodCheckInLabel("mama")).toBe("¿Cómo te sentís hoy?");
    expect(moodCheckInLabel(undefined)).toBe("¿Cómo te sentís hoy?");
  });

  it("asks accompanying roles about her in third person", () => {
    expect(moodCheckInLabel("papa")).toBe("¿Cómo se siente hoy?");
  });
});

describe("ROLE_LABELS / ROLE_ONBOARDING_COPY", () => {
  it("has an entry for every role", () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(ROLE_ONBOARDING_COPY[role].title).toBeTruthy();
      expect(ROLE_ONBOARDING_COPY[role].desc).toBeTruthy();
    }
  });
});
