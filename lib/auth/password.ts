import bcrypt from "bcryptjs";
import "../zodJitless.ts";
import { z } from "zod";

// PR-20 — email + password sign-in, alongside Google/Facebook.
//
// Pure validation and hashing helpers, kept separate from lib/server/auth.ts
// the same way lib/auth/config.ts and lib/auth/consent.ts are: no db import,
// no process.env, no `import "server-only"`, so this is unit-testable and
// reusable from both the signup action and the Credentials `authorize()`
// callback without either one reaching into the other.

/** Same floor OWASP recommends; the UI states it, this enforces it. */
const MIN_PASSWORD_LENGTH = 8;

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .email();

export const PasswordSchema = z
  .string()
  .min(
    MIN_PASSWORD_LENGTH,
    `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  )
  // A password is a secret, not a display string — cap it well above any
  // real passphrase so nobody can pipe megabytes of text into bcrypt (bcrypt
  // itself silently truncates at 72 bytes, which is a hashing footgun, not a
  // DoS one, but there is no reason to accept more than this ever needs).
  .max(200);

/**
 * F17 — bcrypt reads the first 72 BYTES of its input and ignores the rest, so
 * two different accepted passwords sharing those bytes opened the same
 * account, and changing only the tail of a long password changed nothing.
 * UTF-8 bytes, not characters: "ñ", accents and emoji take two to four.
 */
export const BCRYPT_MAX_BYTES = 72;

export function fitsBcrypt(password: unknown): boolean {
  return (
    typeof password === "string" &&
    new TextEncoder().encode(password).length <= BCRYPT_MAX_BYTES
  );
}

export const PASSWORD_TOO_LONG_MESSAGE =
  "Esa contraseña es demasiado larga. Usá hasta 72 letras o números sin tilde (la ñ, las tildes y los emojis ocupan más).";

/**
 * For a password being SET (sign-up, reset). Sign-in keeps `PasswordSchema`:
 * an account created before this rule may have a longer password, and it must
 * keep working — bcrypt compares only the first 72 bytes, exactly as it did
 * when the hash was made.
 */
export const NewPasswordSchema = PasswordSchema.refine(fitsBcrypt, {
  message: PASSWORD_TOO_LONG_MESSAGE,
});

/** bcrypt cost factor. 12 is the current OWASP-recommended floor. */
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * A fixed, valid bcrypt hash of a value nobody will ever type, used to keep
 * `authorize()`'s response time roughly constant whether the email exists or
 * not. Without this, "no such user" returns instantly while "wrong password"
 * takes a full bcrypt comparison — a timing side-channel an attacker can use
 * to enumerate registered emails. Comparing against this dummy hash costs the
 * same as a real comparison and always fails.
 */
export const DUMMY_HASH_FOR_TIMING =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEeO0rr6Ck.NJ7EiCG5AbXBlDDmwYh0Zn.O";
