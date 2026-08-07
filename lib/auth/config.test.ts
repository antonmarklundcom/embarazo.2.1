import { describe, expect, it } from "vitest";
import {
  enabledProviders,
  isAuthConfigured,
  isFacebookConfigured,
  isFacebookEnabled,
  isGoogleConfigured,
  PROVIDER_IDS,
  type AuthEnv,
} from "./config";

// BUILD-PLAN A2. The contract under test is ARCHITECTURE.md §4.2 and §6: an
// unconfigured environment is local-only mode, not an error, and Facebook is
// off until someone deliberately turns it on.

const GOOGLE: AuthEnv = {
  AUTH_SECRET: "s3cr3t",
  AUTH_GOOGLE_ID: "id",
  AUTH_GOOGLE_SECRET: "secret",
};

const FACEBOOK: AuthEnv = {
  AUTH_FACEBOOK_ENABLED: "true",
  AUTH_FACEBOOK_ID: "fb-id",
  AUTH_FACEBOOK_SECRET: "fb-secret",
};

describe("isAuthConfigured", () => {
  it("is false in a completely empty environment", () => {
    expect(isAuthConfigured({})).toBe(false);
  });

  it("is false with a secret but no provider", () => {
    expect(isAuthConfigured({ AUTH_SECRET: "s3cr3t" })).toBe(false);
  });

  it("is false with a provider but no secret", () => {
    expect(
      isAuthConfigured({ AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "secret" }),
    ).toBe(false);
  });

  it("is true once a secret and Google are both present", () => {
    expect(isAuthConfigured(GOOGLE)).toBe(true);
  });

  it("treats blank and whitespace-only values as unset", () => {
    expect(isAuthConfigured({ ...GOOGLE, AUTH_SECRET: "" })).toBe(false);
    expect(isAuthConfigured({ ...GOOGLE, AUTH_SECRET: "   " })).toBe(false);
    expect(isAuthConfigured({ ...GOOGLE, AUTH_GOOGLE_SECRET: "  " })).toBe(
      false,
    );
  });
});

describe("isGoogleConfigured", () => {
  it("needs both halves of the client", () => {
    expect(isGoogleConfigured({ AUTH_GOOGLE_ID: "id" })).toBe(false);
    expect(isGoogleConfigured({ AUTH_GOOGLE_SECRET: "secret" })).toBe(false);
    expect(isGoogleConfigured(GOOGLE)).toBe(true);
  });
});

describe("isFacebookEnabled", () => {
  it("defaults to off when the flag is unset", () => {
    expect(isFacebookEnabled({})).toBe(false);
  });

  it("stays off for anything that is not exactly true", () => {
    for (const value of ["false", "", "0", "yes", "1", "TRUE ", " true "]) {
      const expected = value.trim().toLowerCase() === "true";
      expect(
        isFacebookEnabled({ AUTH_FACEBOOK_ENABLED: value }),
        `AUTH_FACEBOOK_ENABLED=${JSON.stringify(value)}`,
      ).toBe(expected);
    }
  });

  it("turns on for an explicit true", () => {
    expect(isFacebookEnabled({ AUTH_FACEBOOK_ENABLED: "true" })).toBe(true);
  });
});

describe("isFacebookConfigured", () => {
  it("is false when credentials exist but the flag is off — the flag wins", () => {
    expect(
      isFacebookConfigured({
        AUTH_FACEBOOK_ID: "fb-id",
        AUTH_FACEBOOK_SECRET: "fb-secret",
      }),
    ).toBe(false);
  });

  it("is false when the flag is on but credentials are missing", () => {
    expect(isFacebookConfigured({ AUTH_FACEBOOK_ENABLED: "true" })).toBe(false);
  });

  it("is true only with the flag on and both credentials present", () => {
    expect(isFacebookConfigured(FACEBOOK)).toBe(true);
  });
});

describe("enabledProviders", () => {
  it("is empty when nothing is provisioned", () => {
    expect(enabledProviders({})).toEqual([]);
  });

  it("is Google alone in the default launch configuration", () => {
    expect(enabledProviders(GOOGLE)).toEqual(["google"]);
  });

  it("never lists Facebook while the flag is unset, even fully provisioned", () => {
    expect(
      enabledProviders({
        ...GOOGLE,
        AUTH_FACEBOOK_ID: "fb-id",
        AUTH_FACEBOOK_SECRET: "fb-secret",
      }),
    ).toEqual(["google"]);
  });

  it("adds Facebook after the flag flips, without displacing Google", () => {
    expect(enabledProviders({ ...GOOGLE, ...FACEBOOK })).toEqual([
      "google",
      "facebook",
    ]);
  });

  it("can offer Facebook alone if Google is ever unprovisioned", () => {
    expect(enabledProviders(FACEBOOK)).toEqual(["facebook"]);
  });

  it("only ever returns known provider ids", () => {
    for (const id of enabledProviders({ ...GOOGLE, ...FACEBOOK })) {
      expect(PROVIDER_IDS).toContain(id);
    }
  });
});
