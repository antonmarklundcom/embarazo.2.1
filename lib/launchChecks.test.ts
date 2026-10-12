import { describe, expect, it } from "vitest";
import { assertLaunchReady, isDeploymentBuild, isPlaceholderReviewer, launchCheckErrors } from "./launchChecks";

const AUTH_ENV = {
  DATABASE_URL: "mysql://example.invalid/test",
  AUTH_SECRET: "test-secret",
  AUTH_GOOGLE_ID: "test-client",
  AUTH_GOOGLE_SECRET: "test-client-secret",
};
const APP_ENV = { ...AUTH_ENV, NEXT_PUBLIC_APP_URL: "https://mibebe.com.py", NEXT_PUBLIC_SUPPORT_EMAIL: "hola@mibebe.com.py" };

describe("deployment launch requirements", () => {
  it("does not block local and CI builds without a configured app URL", () => {
    expect(isDeploymentBuild({})).toBe(false);
    expect(isDeploymentBuild({ NEXT_PUBLIC_APP_URL: "  " })).toBe(false);
    expect(launchCheckErrors({})).toEqual([]);
    expect(isDeploymentBuild(APP_ENV)).toBe(true);
  });
  it("requires configured Google login for an account-required release", () => {
    const errors = launchCheckErrors({ NEXT_PUBLIC_APP_URL: APP_ENV.NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPPORT_EMAIL: APP_ENV.NEXT_PUBLIC_SUPPORT_EMAIL });
    expect(errors).toHaveLength(1);
    for (const name of Object.keys(AUTH_ENV)) expect(errors[0]).toContain(name);
    expect(launchCheckErrors(APP_ENV)).toEqual([]);
  });
  it("reports only the missing variable names, never secret values", () => {
    const errors = launchCheckErrors({ ...APP_ENV, AUTH_GOOGLE_SECRET: " " });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("AUTH_GOOGLE_SECRET");
    expect(errors[0]).not.toContain("test-secret");
    expect(errors[0]).not.toContain("test-client");
  });
  it("rejects guest-mode release even when auth is otherwise configured", () => {
    expect(launchCheckErrors({ ...APP_ENV, AUTH_REQUIRE_ACCOUNT: "false" })).toEqual([
      expect.stringContaining("Remove AUTH_REQUIRE_ACCOUNT=false"),
    ]);
  });
  it("requires a real deletion channel, with WhatsApp or email sufficient", () => {
    const errors = launchCheckErrors({ ...AUTH_ENV, NEXT_PUBLIC_APP_URL: APP_ENV.NEXT_PUBLIC_APP_URL });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("borrar-cuenta");
    expect(launchCheckErrors({ ...AUTH_ENV, NEXT_PUBLIC_APP_URL: APP_ENV.NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_BUSINESS_WHATSAPP: "+595981123456" })).toEqual([]);
    expect(launchCheckErrors({ ...AUTH_ENV, NEXT_PUBLIC_APP_URL: APP_ENV.NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_BUSINESS_WHATSAPP: "+595000000000" })).toHaveLength(1);
  });
  it("throws with actionable configuration problems and allows a ready release", () => {
    expect(() => assertLaunchReady({ NEXT_PUBLIC_APP_URL: APP_ENV.NEXT_PUBLIC_APP_URL })).toThrow(/NEXT_PUBLIC_SUPPORT_EMAIL/);
    expect(() => assertLaunchReady(APP_ENV)).not.toThrow();
  });
});

describe("legacy reviewer placeholder helper", () => {
  it("detects unset, blank and known placeholders", () => {
    for (const value of [undefined, "   ", "Dra. ___", "placeholder", "TBD"]) expect(isPlaceholderReviewer(value)).toBe(true);
    expect(isPlaceholderReviewer("Dra. Pérez, gineco-obstetra")).toBe(false);
  });
});
