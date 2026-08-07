// BUILD-PLAN A2 — the consent ticket that gates sign-in.
//
// ARCHITECTURE.md §8: "Consent for storing health data is collected explicitly
// at sign-up, not buried in a 'by continuing you agree' line." That means the
// checkbox has to be load-bearing, not decorative: the user ticks it, the
// server writes a short-lived ticket into an httpOnly cookie, and the NextAuth
// `signIn` callback refuses the sign-in if the ticket is missing, expired or
// for an older consent text. Hitting `/api/auth/signin/google` directly does
// not get you an account.
//
// Pure string logic on purpose — no cookies() import, no env, no clock — so the
// rules below are unit-testable and the cookie plumbing stays in one place
// (lib/server/auth.ts).

/**
 * Bump this whenever the consent copy on /cuenta changes materially. Old
 * tickets stop validating, and `users.healthDataConsentVersion` records which
 * text each account actually agreed to — which is the question a regulator or
 * a lawyer asks (§8).
 */
export const CONSENT_VERSION = "2026-08-salud-v1";

/** Cookie name. httpOnly + sameSite=lax so it survives the OAuth round-trip. */
export const CONSENT_COOKIE = "mibebe_consent";

/**
 * How long a ticket stays valid. Long enough to complete a Google round-trip
 * on a slow connection, short enough that a stale cookie cannot authorise a
 * sign-in the user started days ago and abandoned.
 */
export const CONSENT_TTL_MS = 15 * 60 * 1000;

/** Tolerated clock skew between issuing and reading the ticket. */
const CLOCK_SKEW_MS = 60 * 1000;

export interface ConsentTicket {
  version: string;
  issuedAt: number;
}

/**
 * Serialise a ticket. `|` is the separator because the version string is a
 * slug and can never contain one, so parsing is unambiguous.
 *
 * The ticket is deliberately NOT signed. It carries no identity and grants no
 * access on its own — it only unlocks a sign-in the user is simultaneously
 * completing against Google. Forging it buys an attacker the right to consent
 * on their own behalf, which is not a threat.
 */
export function encodeConsent(
  issuedAt: number,
  version: string = CONSENT_VERSION,
): string {
  return `${version}|${issuedAt}`;
}

/**
 * Validate a raw cookie value. Returns the ticket, or null with no distinction
 * between "absent", "malformed", "expired" and "wrong version" — every one of
 * them means the same thing to the caller: send the user back to the checkbox.
 */
export function parseConsent(
  raw: string | undefined | null,
  now: number,
  expectedVersion: string = CONSENT_VERSION,
): ConsentTicket | null {
  if (!raw) return null;

  const separator = raw.indexOf("|");
  if (separator <= 0) return null;

  const version = raw.slice(0, separator);
  if (version !== expectedVersion) return null;

  const issuedAt = Number(raw.slice(separator + 1));
  if (!Number.isSafeInteger(issuedAt) || issuedAt <= 0) return null;

  // A ticket from the future is a tampered or badly-clocked cookie, not consent.
  if (issuedAt > now + CLOCK_SKEW_MS) return null;
  if (now - issuedAt > CONSENT_TTL_MS) return null;

  return { version, issuedAt };
}

/** Convenience for the gate: did the user consent, yes or no. */
export function hasValidConsent(
  raw: string | undefined | null,
  now: number,
): boolean {
  return parseConsent(raw, now) !== null;
}
