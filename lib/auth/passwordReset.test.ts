import { describe, expect, it } from "vitest";

import {
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
} from "./passwordReset";

describe("RESET_TOKEN_TTL_MS", () => {
  it("is 30 minutes, which is what the email and the UI both promise", () => {
    expect(RESET_TOKEN_TTL_MS).toBe(30 * 60 * 1000);
  });
});

describe("generateResetToken()", () => {
  it("never repeats", () => {
    // 1000 draws from a 256-bit space: a collision here is not bad luck, it is
    // a broken generator (a counter, a seeded PRNG, a cached value).
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateResetToken());
    expect(seen.size).toBe(1000);
  });

  it("is 32 bytes of entropy, URL-safe and unpadded", () => {
    const token = generateResetToken();
    // base64url of 32 bytes is 43 characters with no `=` padding.
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // The three characters that would need escaping in a query string, or get
    // mangled by a mail client wrapping a line, must not appear.
    expect(token).not.toMatch(/[+/=]/);
  });

  it("is not obviously biased — both halves of the alphabet show up", () => {
    // A weak stand-in for a randomness test, but it does catch the realistic
    // failure: a generator returning a constant, a short value padded out, or
    // hex masquerading as base64url.
    const bulk = Array.from({ length: 200 }, generateResetToken).join("");
    expect(/[A-Z]/.test(bulk)).toBe(true);
    expect(/[a-z]/.test(bulk)).toBe(true);
    expect(/[0-9]/.test(bulk)).toBe(true);
  });
});

describe("hashResetToken()", () => {
  it("is deterministic — the same token always finds the same row", () => {
    const token = generateResetToken();
    expect(hashResetToken(token)).toBe(hashResetToken(token));
  });

  it("gives different tokens different hashes", () => {
    expect(hashResetToken(generateResetToken())).not.toBe(
      hashResetToken(generateResetToken()),
    );
  });

  it("does not return the token itself, in any form", () => {
    // The whole point of the function: what gets stored must not be usable as a
    // reset link. A hash that contained its input would be a raw token in the
    // table with extra steps.
    const token = generateResetToken();
    const hash = hashResetToken(token);
    expect(hash).not.toBe(token);
    expect(hash).not.toContain(token);
    expect(token).not.toContain(hash);
  });

  it("is SHA-256, hex — 64 lowercase hex characters", () => {
    expect(hashResetToken("whatever")).toMatch(/^[0-9a-f]{64}$/);
    // A known vector, so a future swap to a different algorithm has to be a
    // deliberate change to this line (and therefore to every stored token).
    expect(hashResetToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("changes completely for a one-character difference", () => {
    const a = hashResetToken("token-a");
    const b = hashResetToken("token-b");
    let shared = 0;
    for (let i = 0; i < a.length; i++) if (a[i] === b[i]) shared += 1;
    // Two unrelated 64-char hex strings share ~4 characters by chance. Anything
    // near 64 would mean a prefix-preserving transform, not a hash.
    expect(shared).toBeLessThan(20);
  });
});
