import { createHash, randomBytes } from "node:crypto";

// Password reset — the pure half.
//
// Same separation as `lib/auth/password.ts`: no db import, no `process.env`, no
// `import "server-only"`. Token minting and token hashing are the two things
// this flow gets wrong most often, so they live where a unit test can reach
// them without a database, a mailbox or a NextAuth instance.

/**
 * How long a reset link stays usable.
 *
 * 30 minutes: long enough that a woman on Paraguayan mobile data can open her
 * mail app, wait for it to sync and come back; short enough that a link sitting
 * in an inbox somebody else later reads is usually already dead. Single-use
 * (see `resetPassword` in `lib/server/passwordReset.ts`) is what actually
 * limits exposure; the TTL is the backstop for a link that is never used.
 */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

/**
 * A fresh reset token, raw.
 *
 * 32 bytes from the CSPRNG — 256 bits of entropy, so guessing one is not a
 * strategy even against a limiter that resets on every cold start. `base64url`
 * because this value ends up in a URL query string and must survive being
 * copied out of an email client by hand: no `+`, no `/`, no `=` padding for a
 * mail client to mangle at a line break.
 *
 * This is the ONLY form in which the raw token exists on our side: it goes
 * straight into the link and is never persisted, logged or returned.
 */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * The stored form of a reset token.
 *
 * SHA-256, deliberately, and deliberately NOT bcrypt. bcrypt's cost exists to
 * make a *guessable* secret expensive to attack offline; a 256-bit random token
 * is not guessable, so all the cost would buy is a slow lookup. What matters
 * here is the same property `passwordHash` has: a dump of the
 * `verificationTokens` table must not hand anybody a working reset link. A
 * pre-image of SHA-256 over 256 random bits is not available to anyone.
 *
 * Deterministic on purpose — this is the lookup key, so the row is found by
 * hashing the incoming token and matching, never by scanning and comparing.
 *
 * (The password itself stays on bcrypt. A password IS guessable; this is the
 * one place in the codebase where a fast hash is the right answer, and the
 * distinction is the whole reason this function is documented at this length.)
 */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
