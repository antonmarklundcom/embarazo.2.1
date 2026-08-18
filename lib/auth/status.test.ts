import { describe, it, expect } from "vitest";

import { LOCAL_ONLY, parseAuthStatus } from "./status";

// BUILD-PLAN K1. Everything unrecognised must land on "no accounts here": the
// screen that reads this has nowhere else to send the user if it guesses wrong.

describe("parseAuthStatus", () => {
  it("reads a configured, signed-in deployment", () => {
    expect(parseAuthStatus({ providers: ["google"], signedIn: true })).toEqual({
      providers: ["google"],
      signedIn: true,
    });
  });

  it("reads a configured, signed-out deployment", () => {
    expect(
      parseAuthStatus({ providers: ["google", "facebook"], signedIn: false }),
    ).toEqual({ providers: ["google", "facebook"], signedIn: false });
  });

  it("drops providers it does not know", () => {
    expect(
      parseAuthStatus({ providers: ["google", "myspace", 7, null], signedIn: false }),
    ).toEqual({ providers: ["google"], signedIn: false });
  });

  it("treats anything it cannot read as a local-only device", () => {
    for (const body of [
      null,
      undefined,
      "<!doctype html>",
      42,
      [],
      {},
      { providers: "google" },
      { signedIn: "yes" },
    ]) {
      expect(parseAuthStatus(body)).toEqual(LOCAL_ONLY);
    }
  });

  it("never treats a truthy non-true value as a session", () => {
    expect(parseAuthStatus({ providers: [], signedIn: "true" }).signedIn).toBe(false);
    expect(parseAuthStatus({ providers: [], signedIn: 1 }).signedIn).toBe(false);
  });
});
