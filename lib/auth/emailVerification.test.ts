import { describe, expect, it } from "vitest";

import {
  VERIFICATION_TOKEN_TTL_MS,
  generateVerificationToken,
  hashVerificationToken,
} from "./emailVerification";
import { RESET_TOKEN_TTL_MS } from "./passwordReset";
import { EmailSchema } from "./password";

describe("VERIFICATION_TOKEN_TTL_MS", () => {
  it("is 24 hours, which is what the email and the UI both promise", () => {
    expect(VERIFICATION_TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("is deliberately far more lenient than the reset window", () => {
    // The two are different secrets with different blast radii: a reset token
    // takes over an account, this one only confirms an inbox. Somebody signing
    // up on mobile data may not read the mail until she is home on wifi, and a
    // 30-minute window would mean the feature never works for her.
    expect(VERIFICATION_TOKEN_TTL_MS).toBeGreaterThan(RESET_TOKEN_TTL_MS);
  });
});

describe("generateVerificationToken()", () => {
  it("never repeats", () => {
    // 1000 draws from a 256-bit space: a collision here is not bad luck, it is
    // a broken generator (a counter, a seeded PRNG, a cached value).
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateVerificationToken());
    expect(seen.size).toBe(1000);
  });

  it("is 32 bytes of entropy, URL-safe and unpadded", () => {
    const token = generateVerificationToken();
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // The three characters that would need escaping in a query string, or get
    // mangled by a mail client wrapping a line, must not appear.
    expect(token).not.toMatch(/[+/=]/);
  });

  it("is not obviously biased — both halves of the alphabet show up", () => {
    const bulk = Array.from({ length: 200 }, generateVerificationToken).join("");
    expect(/[A-Z]/.test(bulk)).toBe(true);
    expect(/[a-z]/.test(bulk)).toBe(true);
    expect(/[0-9]/.test(bulk)).toBe(true);
  });
});

describe("hashVerificationToken()", () => {
  it("is deterministic — the same token always finds the same row", () => {
    const token = generateVerificationToken();
    expect(hashVerificationToken(token)).toBe(hashVerificationToken(token));
  });

  it("gives different tokens different hashes", () => {
    expect(hashVerificationToken(generateVerificationToken())).not.toBe(
      hashVerificationToken(generateVerificationToken()),
    );
  });

  it("does not return the token itself, in any form", () => {
    // The whole point: what gets stored must not be usable as a link. A hash
    // that contained its input would be a raw token in the table with extra
    // steps.
    const token = generateVerificationToken();
    const hash = hashVerificationToken(token);
    expect(hash).not.toBe(token);
    expect(hash).not.toContain(token);
    expect(token).not.toContain(hash);
  });

  it("is SHA-256, hex — 64 lowercase hex characters", () => {
    expect(hashVerificationToken("whatever")).toMatch(/^[0-9a-f]{64}$/);
    // A known vector, so a future swap to a different algorithm has to be a
    // deliberate change to this line (and therefore to every stored token).
    expect(hashVerificationToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("changes completely for a one-character difference", () => {
    const a = hashVerificationToken("token-a");
    const b = hashVerificationToken("token-b");
    let shared = 0;
    for (let i = 0; i < a.length; i++) if (a[i] === b[i]) shared += 1;
    expect(shared).toBeLessThan(20);
  });
});

describe("the two namespaces cannot collide", () => {
  it("no valid email can start with the `verify:` prefix", () => {
    // `lib/server/emailVerification.ts` stores rows under `verify:${email}` and
    // password reset stores them under the bare email. That separation only
    // holds if no address can itself look like a namespaced one — otherwise
    // registering `verify:ana@example.com` would put a reset row exactly where
    // Ana's verification row goes. zod's `.email()` rejects a colon, which is
    // what makes the prefix safe; asserted here rather than assumed, because a
    // future relaxation of EmailSchema would silently re-open the collision.
    expect(EmailSchema.safeParse("verify:ana@example.com").success).toBe(false);
    expect(EmailSchema.safeParse("ver:ify@example.com").success).toBe(false);
    // And a normal address still passes, so the assertion above is about the
    // colon and not about a schema that rejects everything.
    expect(EmailSchema.safeParse("ana@example.com").success).toBe(true);
  });
});
