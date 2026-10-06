import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db, isDatabaseConfigured } from "./db";
import { users, verificationTokens } from "./schema";
import { isEmailConfigured, sendPasswordResetEmail } from "./email";
import { EmailSchema, NewPasswordSchema, hashPassword } from "@/lib/auth/password";
import {
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
} from "@/lib/auth/passwordReset";
import { AUTH_RATE_LIMIT, clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";

// Password reset — the server half. The last missing piece of PR-20's
// email + password auth: before this, a forgotten password was a permanent
// lockout with no recovery path at all.
//
// Split out of `lib/server/auth.ts` rather than added to it, for one concrete
// reason: that module imports `next-auth` at module scope, which does not
// evaluate under vitest (see the long note at the top of
// `lib/server/auth.test.ts`, which has to mock the package wholesale to test
// `authorize()`). Nothing in *this* file needs NextAuth, so keeping it out means
// `lib/server/passwordReset.test.ts` can exercise the real functions against a
// faked `./db` and nothing else. Same `import "server-only"` discipline either
// way.
//
// ---------------------------------------------------------------------------
// Storage: `verificationTokens`, reused
// ---------------------------------------------------------------------------
// The table is Auth.js's standard one (`identifier` / `token` / `expires`, PK on
// the first two) and nothing else in this app writes to it — the JWT session
// strategy means the adapter never issues a magic link. So reset tokens live
// there instead of in a new table, which keeps the migration count at zero.
//
//   identifier = the account's email (lowercased by `EmailSchema`)
//   token      = SHA-256 of the raw token, hex. NEVER the raw token.
//   expires    = now + RESET_TOKEN_TTL_MS
//
// The raw token exists in exactly two places: the URL in the email we send, and
// the `?token=` the user hands back. It is never written to the database, never
// logged, and never returned from any function here.

/**
 * `requestPasswordReset` tells the caller only things that are true regardless
 * of whether the email belongs to an account.
 *
 * There is no "unknown email" and no "that account has no password" variant,
 * on purpose — those are the two answers that would turn this endpoint into an
 * email-enumeration oracle, and both of them return `{ ok: true }`.
 */
export type RequestPasswordResetResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "invalid-email"
        | "rate-limited"
        /** No database, no mail transport, or no public URL to build a link on. */
        | "not-configured"
        /** Resend refused or could not be reached. */
        | "send-failed";
    };

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: "invalid-token" | "expired" | "weak-password" | "not-configured" };

/**
 * Where the reset link points.
 *
 * Read from operator-set env (`NEXT_PUBLIC_APP_URL`, then `AUTH_URL`) and
 * **never** from the incoming request's `Host`/`X-Forwarded-Host`. That is the
 * classic host-header injection against exactly this endpoint: an attacker
 * requests a reset for someone else's address with `Host: evil.example`, and the
 * real owner receives a genuine-looking email whose link delivers a live reset
 * token to the attacker's server. Reading a value the attacker cannot set is the
 * only fix that does not depend on remembering to validate.
 *
 * Returns null when unset, which makes the whole feature report
 * `not-configured` rather than mailing a link to nowhere.
 */
function resetUrlFor(token: string): string | null {
  const configured = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    ""
  ).trim();
  if (!configured) return null;
  if (!/^https?:\/\//.test(configured)) return null;
  const base = configured.replace(/\/+$/, "");
  // `encodeURIComponent` even though `base64url` has no characters that need
  // it: the escaping is a property of building a URL, not of today's alphabet.
  return `${base}/cuenta/restablecer?token=${encodeURIComponent(token)}`;
}

/**
 * Start a password reset: mint a token, store its hash, email the link.
 *
 * **Identical behaviour for an email that exists and one that does not.** Both
 * return `{ ok: true }`. An address with no account, and an account that only
 * ever signed in with Google or Facebook (`passwordHash` is null — there is no
 * password to reset, and "restablecé tu contraseña" to someone who has never had
 * one is confusing noise), take the same path and produce the same answer.
 *
 * This is `authorize()`'s `DUMMY_HASH_FOR_TIMING` principle applied one endpoint
 * over. Timing: the row lookup runs unconditionally, and the token is generated
 * and hashed unconditionally, so the cheap work is constant. The residual
 * difference is the write plus the Resend round-trip, which only happen for a
 * real credentials account — unavoidable for any implementation that actually
 * sends mail, and blunted by the rate limit below, which caps an attacker at
 * `AUTH_RATE_LIMIT` probes a minute per address.
 *
 * `headers` is the real incoming request's, for the limiter's key.
 */
export async function requestPasswordReset(
  email: string,
  headers: Headers,
): Promise<RequestPasswordResetResult> {
  // R0-3's discipline: a namespaced key. `reset:` rather than `auth:` because
  // this is a distinct surface with a distinct cost (it sends mail), and a
  // shared namespace means a household hammering sign-in also burns the
  // recovery budget of the one person there who genuinely forgot her password —
  // locking her out of the only way back in. Sharing one bucket across surfaces
  // is precisely what R0-3 fixed for `/api/v1/go`.
  if (
    isRateLimited(
      `reset:${clientKeyFromHeaders(headers)}`,
      Date.now(),
      AUTH_RATE_LIMIT,
    )
  ) {
    return { ok: false, error: "rate-limited" };
  }

  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "invalid-email" };

  // Every one of these is independent of whether the address has an account, so
  // reporting them leaks nothing an attacker could not learn with any address.
  if (!isDatabaseConfigured()) return { ok: false, error: "not-configured" };
  if (!isEmailConfigured()) return { ok: false, error: "not-configured" };

  const token = generateResetToken();
  const url = resetUrlFor(token);
  if (!url) return { ok: false, error: "not-configured" };

  const [row] = await db()
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, parsed.data))
    .limit(1);

  // No account, or an OAuth-only account with no password: stop here and answer
  // exactly as if a mail had gone out. No row is written and nothing is sent.
  if (!row?.passwordHash) return { ok: true };

  // One active reset at a time. Clearing first means an older link that is
  // still inside its 30 minutes stops working the moment a newer one is asked
  // for, so "I requested it twice" cannot leave two live tokens in two inboxes.
  await db()
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, parsed.data));

  await db()
    .insert(verificationTokens)
    .values({
      identifier: parsed.data,
      token: hashResetToken(token),
      expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

  try {
    await sendPasswordResetEmail(parsed.data, url);
  } catch {
    // Awaited on purpose (see lib/server/email.ts): telling a locked-out user
    // "revisá tu correo" when the mail never left is how she waits forever.
    // The caught error is not logged — its message would be the only thing in
    // this flow that could carry request detail into a log.
    return { ok: false, error: "send-failed" };
  }

  return { ok: true };
}

/**
 * Finish a password reset: consume the token, set the new password, sign every
 * existing session out.
 *
 * F18 — single use is a CLAIM, not a read. The token row is deleted inside the
 * same transaction that writes the password, and the write happens only if that
 * delete removed exactly one row. Two requests racing with one link therefore
 * get exactly one success; the loser's delete matches nothing and it answers
 * `invalid-token`, indistinguishable from a made-up token. A failed password
 * write rolls the claim back, so the link is not burned by our own error, and a
 * newer reset request (which replaces the row) invalidates an older one that is
 * still hashing.
 */
export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: "not-configured" };

  if (typeof rawToken !== "string" || rawToken.length === 0 || rawToken.length > 512) {
    return { ok: false, error: "invalid-token" };
  }

  // F17: setting a password — it must fit bcrypt's 72 bytes.
  const password = NewPasswordSchema.safeParse(newPassword);
  if (!password.success) return { ok: false, error: "weak-password" };

  const hashed = hashResetToken(rawToken);

  // A cheap read first, so a made-up or expired token costs no bcrypt.
  const [row] = await db()
    .select({
      identifier: verificationTokens.identifier,
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(eq(verificationTokens.token, hashed))
    .limit(1);

  if (!row) return { ok: false, error: "invalid-token" };

  if (row.expires.getTime() <= Date.now()) {
    await db()
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, row.identifier),
          eq(verificationTokens.token, hashed),
        ),
      );
    return { ok: false, error: "expired" };
  }

  // The identifier must be an account's address. A confirmation token
  // (`verify:<email>`) or an address with no account is a dead end here, and
  // a dead end must not spend the token — a misused link costs nothing.
  const [owner] = await db()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, row.identifier))
    .limit(1);
  if (!owner) return { ok: false, error: "invalid-token" };

  const passwordHash = await hashPassword(password.data);

  // It may have expired while bcrypt ran.
  if (row.expires.getTime() <= Date.now()) return { ok: false, error: "expired" };

  return db().transaction(async (tx) => {
    const claim = await tx
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, row.identifier),
          eq(verificationTokens.token, hashed),
        ),
      );
    if (affectedRows(claim) !== 1) {
      return { ok: false, error: "invalid-token" } as const;
    }

    const [account] = await tx
      .select({ id: users.id, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.email, row.identifier))
      .limit(1);
    // No account (or one being erased): the token is spent either way.
    if (!account || account.deletedAt) {
      return { ok: false, error: "invalid-token" } as const;
    }

    await tx
      .update(users)
      .set({
        passwordHash,
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(eq(users.id, account.id));

    return { ok: true } as const;
  });
}

/** mysql2 reports a DELETE's row count here — same reading as lib/server/account.ts. */
function affectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const rows = (header as { affectedRows?: number } | undefined)?.affectedRows;
  return typeof rows === "number" ? rows : 0;
}
