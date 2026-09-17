import { createHash, randomBytes } from "node:crypto";

// Email verification — the pure half.
//
// Same separation as `lib/auth/password.ts` and `lib/auth/passwordReset.ts`: no
// db import, no `process.env`, no `import "server-only"`. Minting and hashing
// are the two things a token flow gets wrong most often, so they live where a
// unit test can reach them without a database, a mailbox or a NextAuth instance.
//
// Deliberately a separate module from `lib/auth/passwordReset.ts` even though
// the two are shaped alike. They are not the same secret: a reset token grants
// the ability to *take over* an account, a verification token only confirms that
// somebody can read the inbox they signed up with. Sharing one TTL constant
// would quietly tie those two very different risk profiles together — which is
// exactly what the differing windows below exist to keep apart.

/**
 * How long a verification link stays usable: 24 hours.
 *
 * Much more lenient than the 30 minutes `RESET_TOKEN_TTL_MS` allows, on
 * purpose. A reset link is a credential-recovery race — somebody is locked out
 * *right now*, and a stale link sitting in an inbox is a takeover waiting to
 * happen. This one only answers "can you read this mailbox", and the person
 * reading it is not in a hurry: she signed up on the bus, the mail syncs when
 * she gets home on wifi, and a link that died in thirty minutes would mean the
 * feature never works for the users this app is actually for.
 *
 * Nothing is gated on verification (see `lib/server/auth.ts`'s `authorize()`,
 * which deliberately does NOT check `emailVerified`), so a long window here
 * costs nothing an attacker can spend.
 */
export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * A fresh verification token, raw.
 *
 * 32 bytes from the CSPRNG and `base64url`, for the same two reasons
 * `generateResetToken()` gives: 256 bits so guessing is not a strategy, and an
 * alphabet with no `+`, `/` or `=` so the value survives a query string and a
 * mail client wrapping a line.
 *
 * This is the ONLY form in which the raw token exists on our side: it goes
 * straight into the link and is never persisted, logged or returned.
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * The stored form of a verification token.
 *
 * SHA-256 hex, not bcrypt — see the long note on `hashResetToken()`: bcrypt's
 * cost buys resistance to guessing, and a 256-bit random value is not
 * guessable. What matters is that a dump of `verificationTokens` hands nobody a
 * working link, and a pre-image of SHA-256 over 256 random bits is not
 * available to anyone.
 *
 * Deterministic on purpose — this is the lookup key.
 */
export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
