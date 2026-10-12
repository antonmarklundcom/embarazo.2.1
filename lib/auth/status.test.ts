import { describe, it, expect } from "vitest";
import { LOCAL_ONLY, parseAuthStatus } from "./status";

describe("parseAuthStatus", () => {
  it("reads configured providers and the signed-in caller's own identifier", () => {
    expect(parseAuthStatus({ providers: ["google"], credentialsAvailable: true, signedIn: true, accountId: "owner" })).toEqual({
      providers: ["google"], credentialsAvailable: true, signedIn: true, accountRequired: true, accountId: "owner",
    });
  });
  it("never exposes an identifier for a signed-out caller", () => {
    expect(parseAuthStatus({ providers: ["google", "facebook"], credentialsAvailable: true, signedIn: false, accountId: "stale" })).toEqual({
      providers: ["google", "facebook"], credentialsAvailable: true, signedIn: false, accountRequired: true, accountId: null,
    });
  });
  it("drops unknown providers and retains legacy password login", () => {
    expect(parseAuthStatus({ providers: ["google", "myspace", 7, null], signedIn: false })).toEqual({
      ...LOCAL_ONLY, providers: ["google"],
    });
    expect(parseAuthStatus({ credentialsAvailable: true })).toEqual({ ...LOCAL_ONLY, credentialsAvailable: true });
  });
  it("fails closed when the server is unavailable or unreadable", () => {
    for (const body of [null, undefined, "<!doctype html>", 42, [], {}, { providers: "google" }, { signedIn: "yes" }]) {
      expect(parseAuthStatus(body)).toEqual(LOCAL_ONLY);
    }
  });
  it("only an explicit test-preview false can permit guest mode", () => {
    for (const accountRequired of [undefined, null, 0, "false"]) {
      expect(parseAuthStatus({ accountRequired }).accountRequired).toBe(true);
    }
    expect(parseAuthStatus({ accountRequired: false }).accountRequired).toBe(false);
  });
  it("rejects invalid ownership identities even with a signed-in flag", () => {
    for (const accountId of [null, 42, "", " ", "x".repeat(129)]) {
      expect(parseAuthStatus({ signedIn: true, accountId }).accountId).toBeNull();
    }
  });
  it("never treats truthy values as sessions or credentials", () => {
    expect(parseAuthStatus({ credentialsAvailable: "true", signedIn: "true" }).signedIn).toBe(false);
    expect(parseAuthStatus({ credentialsAvailable: 1, signedIn: 1 }).credentialsAvailable).toBe(false);
  });
});
