import { describe, expect, it } from "vitest";
import {
  assertLaunchReady,
  isDeploymentBuild,
  isPlaceholderReviewer,
  launchCheckErrors,
} from "./launchChecks";

const REAL_REVIEWER = "Dra. Pérez, gineco-obstetra";
/** A configured deletion channel, so tests that don't care about it pass. */
const REAL_EMAIL = "hola@mibebe.com.py";

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
  // No longer used to gate the build (DECISIONS.md "disclaimer model, not a
  // named reviewer") — still used at render time by MedicalReviewByline and
  // ObstetraCard to choose between the named byline and the generic
  // disclaimer.
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
  it("stays silent for non-deployment builds", () => {
    expect(launchCheckErrors({})).toEqual([]);
  });

  it("passes a deployment build with a deletion channel and no reviewer set", () => {
    // The reviewer is no longer a build gate — a deployment with nobody named
    // as medical reviewer ships fine, with the disclaimer instead of a byline.
    expect(
      launchCheckErrors({
        NEXT_PUBLIC_APP_URL: "https://mibebe.com.py",
        NEXT_PUBLIC_SUPPORT_EMAIL: REAL_EMAIL,
      }),
    ).toEqual([]);
  });

  it("blocks a deployment build where nobody can be contacted", () => {
    const errors = launchCheckErrors({
      NEXT_PUBLIC_APP_URL: "https://mibebe.com.py",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/borrar-cuenta/);
  });

  it("accepts WhatsApp alone as the deletion channel", () => {
    // One way through is enough. Requiring both would be a rule invented here
    // rather than one Play asks for.
    expect(
      launchCheckErrors({
        NEXT_PUBLIC_APP_URL: "https://mibebe.com.py",
        NEXT_PUBLIC_BUSINESS_WHATSAPP: "+595981123456",
      }),
    ).toEqual([]);
  });

  it("does not count a placeholder WhatsApp as a channel", () => {
    // C8's dead number wearing a fallback's clothes must not satisfy this.
    const errors = launchCheckErrors({
      NEXT_PUBLIC_APP_URL: "https://mibebe.com.py",
      NEXT_PUBLIC_BUSINESS_WHATSAPP: "+595000000000",
    });
    expect(errors).toHaveLength(1);
  });

  it("stays silent for a local build with nothing configured at all", () => {
    // A contributor running `npm run build` is not deploying.
    expect(launchCheckErrors({})).toEqual([]);
  });
});

describe("assertLaunchReady", () => {
  it("throws with the problem listed", () => {
    expect(() =>
      assertLaunchReady({ NEXT_PUBLIC_APP_URL: "https://mibebe.com.py" }),
    ).toThrow(/NEXT_PUBLIC_SUPPORT_EMAIL/);
  });

  it("does not throw when ready", () => {
    expect(() =>
      assertLaunchReady({
        NEXT_PUBLIC_APP_URL: "https://mibebe.com.py",
        NEXT_PUBLIC_SUPPORT_EMAIL: REAL_EMAIL,
      }),
    ).not.toThrow();
  });
});
