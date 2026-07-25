import { describe, expect, it } from "vitest";
import {
  authDisabledReasons,
  enabledProviderIds,
  isAuthEnabled,
  isFacebookConfigured,
  isGoogleConfigured,
  type AuthConfigEnv,
} from "./authConfig";

// BUILD-PLAN A2. The property under test is the one from ARCHITECTURE.md §4.2:
// nothing configured must resolve to "local-only mode", never to a broken
// sign-in button.

const FULL: AuthConfigEnv = {
  DATABASE_URL: "mysql://user:pw@localhost:3306/mibebe",
  AUTH_SECRET: "secret",
  AUTH_GOOGLE_ID: "google-id",
  AUTH_GOOGLE_SECRET: "google-secret",
};

describe("isGoogleConfigured", () => {
  it("needs both id and secret", () => {
    expect(isGoogleConfigured({})).toBe(false);
    expect(isGoogleConfigured({ AUTH_GOOGLE_ID: "id" })).toBe(false);
    expect(isGoogleConfigured({ AUTH_GOOGLE_SECRET: "s" })).toBe(false);
    expect(
      isGoogleConfigured({ AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "s" }),
    ).toBe(true);
  });

  it("treats blank values as unset", () => {
    expect(
      isGoogleConfigured({ AUTH_GOOGLE_ID: "  ", AUTH_GOOGLE_SECRET: "s" }),
    ).toBe(false);
  });
});

describe("isFacebookConfigured", () => {
  const creds = { AUTH_FACEBOOK_ID: "id", AUTH_FACEBOOK_SECRET: "s" };

  it("stays off without the explicit opt-in flag, even with credentials", () => {
    // Meta business verification takes weeks; credentials existing does not
    // mean the app has been approved to use them.
    expect(isFacebookConfigured(creds)).toBe(false);
    expect(
      isFacebookConfigured({ ...creds, AUTH_FACEBOOK_ENABLED: "false" }),
    ).toBe(false);
  });

  it("turns on only with the flag AND credentials", () => {
    expect(isFacebookConfigured({ AUTH_FACEBOOK_ENABLED: "true" })).toBe(false);
    expect(
      isFacebookConfigured({ ...creds, AUTH_FACEBOOK_ENABLED: "true" }),
    ).toBe(true);
  });
});

describe("enabledProviderIds", () => {
  it("is empty with nothing configured", () => {
    expect(enabledProviderIds({})).toEqual([]);
  });

  it("lists google first when both are on", () => {
    expect(
      enabledProviderIds({
        ...FULL,
        AUTH_FACEBOOK_ENABLED: "true",
        AUTH_FACEBOOK_ID: "id",
        AUTH_FACEBOOK_SECRET: "s",
      }),
    ).toEqual(["google", "facebook"]);
  });
});

describe("isAuthEnabled", () => {
  it("is false with nothing configured", () => {
    expect(isAuthEnabled({})).toBe(false);
  });

  it("needs a database, a secret and at least one provider", () => {
    expect(isAuthEnabled({ ...FULL, DATABASE_URL: undefined })).toBe(false);
    expect(isAuthEnabled({ ...FULL, AUTH_SECRET: undefined })).toBe(false);
    expect(isAuthEnabled({ ...FULL, AUTH_GOOGLE_ID: undefined })).toBe(false);
    expect(isAuthEnabled(FULL)).toBe(true);
  });
});

describe("authDisabledReasons", () => {
  it("is empty when auth is on", () => {
    expect(authDisabledReasons(FULL)).toEqual([]);
  });

  it("names every missing piece at once", () => {
    const reasons = authDisabledReasons({});
    expect(reasons).toHaveLength(3);
    expect(reasons.join(" ")).toContain("DATABASE_URL");
    expect(reasons.join(" ")).toContain("AUTH_SECRET");
  });
});
