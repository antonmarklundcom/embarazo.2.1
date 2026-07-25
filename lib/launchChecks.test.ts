import { describe, expect, it } from "vitest";
import {
  assertLaunchReady,
  isDeploymentBuild,
  isPlaceholderReviewer,
  launchCheckErrors,
} from "./launchChecks";

const REAL_REVIEWER = "Dra. Pérez, gineco-obstetra";

describe("isDeploymentBuild", () => {
  it("is false for a local or CI build with no app URL", () => {
    expect(isDeploymentBuild({})).toBe(false);
    expect(isDeploymentBuild({ NEXT_PUBLIC_APP_URL: "  " })).toBe(false);
  });

  it("is true once an app URL is configured", () => {
    expect(isDeploymentBuild({ NEXT_PUBLIC_APP_URL: "https://mibebe.com.py" }))
      .toBe(true);
  });
});

describe("isPlaceholderReviewer", () => {
  it("flags unset and blank", () => {
    expect(isPlaceholderReviewer(undefined)).toBe(true);
    expect(isPlaceholderReviewer("   ")).toBe(true);
  });

  it("flags the known placeholder shapes", () => {
    expect(isPlaceholderReviewer("Dra. ___, gineco-obstetra")).toBe(true);
    expect(isPlaceholderReviewer("placeholder")).toBe(true);
    expect(isPlaceholderReviewer("TBD")).toBe(true);
  });

  it("accepts a real name", () => {
    expect(isPlaceholderReviewer(REAL_REVIEWER)).toBe(false);
  });
});

describe("launchCheckErrors", () => {
  it("stays silent for non-deployment builds even with no reviewer", () => {
    expect(launchCheckErrors({})).toEqual([]);
  });

  it("blocks a deployment build with a placeholder reviewer", () => {
    const errors = launchCheckErrors({
      NEXT_PUBLIC_APP_URL: "https://mibebe.com.py",
      NEXT_PUBLIC_MEDICAL_REVIEWER: "Dra. ___, gineco-obstetra",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("NEXT_PUBLIC_MEDICAL_REVIEWER");
  });

  it("passes a deployment build with a real reviewer", () => {
    expect(
      launchCheckErrors({
        NEXT_PUBLIC_APP_URL: "https://mibebe.com.py",
        NEXT_PUBLIC_MEDICAL_REVIEWER: REAL_REVIEWER,
      }),
    ).toEqual([]);
  });

  it("honours the explicit override", () => {
    expect(
      launchCheckErrors({
        NEXT_PUBLIC_APP_URL: "https://mibebe.com.py",
        ALLOW_PLACEHOLDER_REVIEWER: "1",
      }),
    ).toEqual([]);
  });
});

describe("assertLaunchReady", () => {
  it("throws with the problem listed", () => {
    expect(() =>
      assertLaunchReady({ NEXT_PUBLIC_APP_URL: "https://mibebe.com.py" }),
    ).toThrow(/NEXT_PUBLIC_MEDICAL_REVIEWER/);
  });

  it("does not throw when ready", () => {
    expect(() =>
      assertLaunchReady({
        NEXT_PUBLIC_APP_URL: "https://mibebe.com.py",
        NEXT_PUBLIC_MEDICAL_REVIEWER: REAL_REVIEWER,
      }),
    ).not.toThrow();
  });
});
