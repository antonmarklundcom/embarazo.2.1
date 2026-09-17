import "server-only";

import { and, eq } from "drizzle-orm";

import { db, isDatabaseConfigured } from "./db";
import { users, verificationTokens } from "./schema";
import { isEmailConfigured, sendVerificationEmail } from "./email";
import { EmailSchema } from "@/lib/auth/password";
import {
  VERIFICATION_TOKEN_TTL_MS,
  generateVerificationToken,
  hashVerificationToken,
} from "@/lib/auth/emailVerification";
import { AUTH_RATE_LIMIT, clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";

// Email verification — the server half.
//
// Before this, `registerCredentialsUser()` created an account and signed it in
// with no evidence at all that the address belonged to the person typing it. That
// made `users.email` — the column password reset resolves an account by — a
// field anybody could put anybody else's address into.
//
// Split out of `lib/server/auth.ts` for the same reason `./passwordReset.ts` is:
// that module imports `next-auth` at module scope, which does not evaluate under
// vitest (see the note at the top of `./auth.test.ts`). Nothing here needs
// NextAuth, so `./emailVerification.test.ts` exercises the real functions
// against a faked `./db` and `./email` and nothing else.
//
// ---------------------------------------------------------------------------
// Not a sign-in gate. Deliberately.
// ---------------------------------------------------------------------------
// `authorize()` in `./auth.ts` does not consult `users.emailVerified`, and this
// unit did not add such a check. Every credentials account created before this
// shipped has `emailVerified = null` and there is no honest way to backfill it —
// mailing the whole userbase a confirmation demand, or guessing, are both worse
// than the status quo. Gating sign-in would therefore lock out every existing
// user permanently.
//
// So verification is informational and best-effort, exactly like every other
// optional integration in this codebase (`SHEETS_WEBHOOK_URL`,
// `PHOTO_STORAGE_ENDPOINT`, Resend itself): its absence changes what we can
// offer, never whether the core feature works. A failed send does not fail a
// signup, and an unconfirmed address is a nudge on `/cuenta/verificar`, never a
// block.
//
// ---------------------------------------------------------------------------
// Storage: `verificationTokens`, namespaced
// ---------------------------------------------------------------------------
// Password reset already uses this table with `identifier = the plain lowercased
// email`, and clears every row for that identifier on each new request ("one
// active reset at a time"). Storing verification tokens under the same
// identifier would make those two delete-by-identifier statements step on each
// other: asking for a verification mail would silently kill a live reset link,
// and vice versa. That is not hypothetical — a brand-new user who forgets the
// password she chose two minutes ago hits it on her first day.
//
// The fix is a namespace. Verification rows are keyed
//
//   identifier = `verify:${email}`
//   token      = SHA-256 of the raw token, hex. NEVER the raw token.
//   expires    = now + VERIFICATION_TOKEN_TTL_MS
//
// so every delete here is scoped to rows this feature owns, and password reset's
// deletes cannot see them. The two namespaces cannot collide by accident either:
// `EmailSchema` is zod's `.email()`, which rejects a `:` anywhere in the
// address, so no real `identifier` for a reset can ever start with `verify:`.

/**
 * The prefix that separates this feature's rows from password reset's.
 *
 * Exported so a test can assert the namespacing rather than re-deriving it, and
 * so the collision this prevents stays a named thing rather than a string
 * literal repeated in three places.
 */
export const VERIFY_IDENTIFIER_PREFIX = "verify:";

/** `verify:ana@example.com` — the `identifier` a verification row is stored under. */
export function verificationIdentifier(email: string): string {
  return `${VERIFY_IDENTIFIER_PREFIX}${email}`;
}

export type RequestVerificationResult =
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

export type VerifyEmailResult =
  | { ok: true }
  | { ok: false; error: "invalid-token" | "expired" };

/**
 * Where the confirmation link points.
 *
 * Read from operator-set env (`NEXT_PUBLIC_APP_URL`, then `AUTH_URL`) and
 * **never** from the incoming request's `Host`/`X-Forwarded-Host`, for the same
 * reason `resetUrlFor` does it this way. The host-header injection applies here
 * identically: a link built from an attacker-set header would send the real
 * owner a genuine-looking mail whose click delivers a live token to the
 * attacker's server — and one spent on her address, which is precisely the claim
 * this feature exists to make. Reading a value the attacker cannot set is the
 * only fix that does not depend on remembering to validate.
 *
 * Returns null when unset, which degrades the feature to absent rather than
 * mailing a link to nowhere.
 */
function verifyUrlFor(token: string): string | null {
  const configured = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    ""
  ).trim();
  if (!configured) return null;
  if (!/^https?:\/\//.test(configured)) return null;
  const base = configured.replace(/\/+$/, "");
  return `${base}/cuenta/verificar?token=${encodeURIComponent(token)}`;
}

/**
 * Mint a token, store its hash, mail the link. The whole of the send path,
 * shared by the fire-and-forget caller in `registerCredentialsUser()` and the
 * user-facing resend action.
 *
 * **No email-enumeration defence here, unlike `requestPasswordReset`.** That is
 * not an omission: the row lookup this would have to hide does not exist. This
 * function is only ever reached with an address that either was just used to
 * create an account (the signup path, where the caller already knows the answer)
 * or belongs to the signed-in session asking for a resend (same). There is no
 * "does this email have an account" question for an attacker to probe, so
 * pretending otherwise would only cost the operator the ability to see that
 * Resend is down.
 */
async function deliverVerification(
  email: string,
): Promise<RequestVerificationResult> {
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "invalid-email" };

  if (!isDatabaseConfigured()) return { ok: false, error: "not-configured" };
  if (!isEmailConfigured()) return { ok: false, error: "not-configured" };

  const identifier = verificationIdentifier(parsed.data);
  // `verificationTokens.identifier` is varchar(255) (the Auth.js adapter's own
  // column, not ours to widen). An address long enough that the prefix pushes it
  // over would be silently truncated by MySQL, and a truncated identifier is one
  // that could collide with another row — so refuse instead. RFC 5321 caps a
  // real address at 254, so this is unreachable in practice and cheap to hold.
  if (identifier.length > 255) return { ok: false, error: "invalid-email" };

  const token = generateVerificationToken();
  const url = verifyUrlFor(token);
  if (!url) return { ok: false, error: "not-configured" };

  // One live confirmation link at a time, and — because of the namespace — this
  // delete cannot reach the plain-email row a password reset may be holding for
  // the very same address.
  await db().delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));

  await db()
    .insert(verificationTokens)
    .values({
      identifier,
      token: hashVerificationToken(token),
      expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    });

  try {
    await sendVerificationEmail(parsed.data, url);
  } catch {
    // Reported, not logged: the caught error's message is the only value in this
    // flow that could carry the address or the link into a log aggregator.
    return { ok: false, error: "send-failed" };
  }

  return { ok: true };
}

/**
 * Send the confirmation mail for a freshly created account.
 *
 * Returns `void` and never throws, because of where it is called from:
 * `registerCredentialsUser()`, immediately after the `INSERT` that created the
 * account. The account is the thing the user asked for and it is already real;
 * losing it because Resend had a bad minute would be the worst possible trade.
 * Nothing is logged on the way out for the same reason `requestPasswordReset`
 * logs nothing — there is no message to write here that would not contain an
 * email address.
 *
 * Callers that need to *tell* somebody what happened use
 * `requestVerificationResend()` below instead.
 */
export async function sendVerificationFor(email: string): Promise<void> {
  try {
    await deliverVerification(email);
  } catch {
    // Swallowed on purpose. `deliverVerification` already turns a failed send
    // into a returned error; this catch covers the database calls around it, so
    // that a signup can never be undone by a verification mail.
  }
}

/**
 * "Mandame el enlace de nuevo" — the same send, with an answer the UI can show
 * and a rate limit, because this one is reachable on demand.
 *
 * `headers` is the real incoming request's, for the limiter's key.
 */
export async function requestVerificationResend(
  email: string,
  headers: Headers,
): Promise<RequestVerificationResult> {
  // A namespace of its own — `verify:`, not `auth:` and not `reset:`. R0-3's
  // lesson, one surface over: this endpoint sends mail to a third party's
  // inbox, so it needs a budget that somebody hammering sign-in cannot burn,
  // and one whose exhaustion cannot lock a locked-out user out of password
  // recovery. The invariant test in `lib/invariants/rateLimits.test.ts` holds
  // this line.
  if (
    isRateLimited(
      `verify:${clientKeyFromHeaders(headers)}`,
      Date.now(),
      AUTH_RATE_LIMIT,
    )
  ) {
    return { ok: false, error: "rate-limited" };
  }

  return deliverVerification(email);
}

/**
 * Spend a confirmation link: stamp `users.emailVerified` and delete the token.
 *
 * Single-use, enforced by deleting the row, scoped to the exact
 * `(identifier, token)` pair — the table's primary key — so a second click gets
 * `invalid-token`, indistinguishable from a token nobody ever issued.
 *
 * There is no `not-configured` variant. With no database there is no token
 * anybody could be holding, so "this link does not work" is both the honest
 * answer and the one that tells the person the useful thing.
 */
export async function verifyEmailToken(
  rawToken: string,
): Promise<VerifyEmailResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: "invalid-token" };

  // Cheap guard before any query: `base64url` of 32 bytes is 43 characters, and
  // a 1 MB "token" should not become a database round-trip.
  if (typeof rawToken !== "string" || rawToken.length === 0 || rawToken.length > 512) {
    return { ok: false, error: "invalid-token" };
  }

  const hashed = hashVerificationToken(rawToken);
  const [row] = await db()
    .select({
      identifier: verificationTokens.identifier,
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(eq(verificationTokens.token, hashed))
    .limit(1);

  if (!row) return { ok: false, error: "invalid-token" };

  // The namespace check is the second half of the lookup, and it is what keeps
  // the two features' tokens from being interchangeable. `hashVerificationToken`
  // and `hashResetToken` are both SHA-256, so a *password-reset* token's hash
  // would be found by the query above — and is rejected right here, because its
  // identifier is a bare email. Without this, a reset link could be spent as a
  // confirmation click, which would quietly consume somebody's only way back
  // into her account.
  if (!row.identifier.startsWith(VERIFY_IDENTIFIER_PREFIX)) {
    return { ok: false, error: "invalid-token" };
  }

  if (row.expires.getTime() <= Date.now()) {
    // Spent either way: an expired row must not linger waiting for a clock skew
    // or a careless future query to accept it.
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

  const email = row.identifier.slice(VERIFY_IDENTIFIER_PREFIX.length);

  // Resolve the account by email once, then update by primary key — the same
  // shape `resetPassword` uses, for the same reason: `users.email` carries no
  // unique index (it is the Auth.js adapter's column set, unchanged), so an
  // `UPDATE ... WHERE email = ?` is a statement whose row count depends on data
  // this code does not control.
  const [account] = await db()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!account) return { ok: false, error: "invalid-token" };

  await db()
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, account.id));

  // Single-use. Last, so a failed update above leaves the link usable rather
  // than stranding somebody with a spent token and an unconfirmed address.
  await db()
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, row.identifier),
        eq(verificationTokens.token, hashed),
      ),
    );

  return { ok: true };
}

export interface VerificationStatus {
  /** The address is confirmed. */
  verified: boolean;
  /** It makes sense to ask *this* account to confirm. See below. */
  shouldConfirm: boolean;
}

/**
 * What, if anything, to say to this account about its address.
 *
 * Both false is the answer whenever we cannot tell — no database, no such row, a
 * query that threw — because the only honest options are "confirmed",
 * "unconfirmed" and silence, and a hiccup must not turn into an accusation.
 *
 * `shouldConfirm` is deliberately narrower than `!verified`. It is false for an
 * account with no `passwordHash`: a Google or Facebook sign-in never populates
 * `emailVerified` either (nothing in `./auth.ts`'s adapter or events writes it),
 * so every OAuth account reads as unconfirmed forever — and nagging somebody to
 * confirm an address Google already verified for us would be noise she cannot
 * usefully act on. The nudge is for the flow that actually has an unverified
 * address: email + password signup.
 */
export async function verificationStatusFor(
  userId: string,
): Promise<VerificationStatus> {
  const silent: VerificationStatus = { verified: false, shouldConfirm: false };
  if (!isDatabaseConfigured()) return silent;
  try {
    const [row] = await db()
      .select({
        emailVerified: users.emailVerified,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) return silent;
    if (row.emailVerified) return { verified: true, shouldConfirm: false };
    return { verified: false, shouldConfirm: row.passwordHash !== null };
  } catch {
    return silent;
  }
}
