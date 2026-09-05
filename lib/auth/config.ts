// BUILD-PLAN A2 — which sign-in providers exist, decided purely from env.
//
// No `import "server-only"` and no `process.env` reads at module scope: every
// function takes the environment as an argument so it is unit-testable and so
// nothing here can throw at import time. That matters because of the hard
// requirement in ARCHITECTURE.md §4.2 — the app must build and run with
// AUTH_SECRET / AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET all unset. Unconfigured is
// not an error state, it is "seguir sin cuenta" mode, which is a first-class
// path and not a degraded one.

/** The providers this app can ever offer. Order is display order. */
export const PROVIDER_IDS = ["google", "facebook"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

/** The variables this module reads. Documented here, not scattered in code. */
export type AuthEnvKey =
  | "AUTH_SECRET"
  | "AUTH_GOOGLE_ID"
  | "AUTH_GOOGLE_SECRET"
  | "AUTH_FACEBOOK_ENABLED"
  | "AUTH_FACEBOOK_ID"
  | "AUTH_FACEBOOK_SECRET";

/**
 * Any environment-shaped bag. The index signature is what lets `process.env`
 * be passed directly while tests pass a two-key literal.
 */
export type AuthEnv = Partial<Record<AuthEnvKey, string | undefined>> & {
  readonly [key: string]: string | undefined;
};

/** Trim and treat blank strings as absent — a blank var in `.env` is "unset". */
function value(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Facebook is off unless someone deliberately turns it on. Meta business
 * verification + app review takes weeks and needs a live privacy-policy URL
 * (ARCHITECTURE.md §6), so the flag defaults to false and the provider is
 * simply absent until it flips — it must never block Google or the app.
 */
export function isFacebookEnabled(env: AuthEnv): boolean {
  return value(env.AUTH_FACEBOOK_ENABLED)?.toLowerCase() === "true";
}

/** True when Google is fully provisioned (both halves of the client present). */
export function isGoogleConfigured(env: AuthEnv): boolean {
  return (
    value(env.AUTH_GOOGLE_ID) !== undefined &&
    value(env.AUTH_GOOGLE_SECRET) !== undefined
  );
}

/** True when Facebook is both flagged on and fully provisioned. */
export function isFacebookConfigured(env: AuthEnv): boolean {
  return (
    isFacebookEnabled(env) &&
    value(env.AUTH_FACEBOOK_ID) !== undefined &&
    value(env.AUTH_FACEBOOK_SECRET) !== undefined
  );
}

/**
 * The providers to render, in display order. Empty means "no sign-in is
 * possible here" — the UI says so plainly instead of showing a button that
 * cannot work.
 */
export function enabledProviders(env: AuthEnv): ProviderId[] {
  const ids: ProviderId[] = [];
  if (isGoogleConfigured(env)) ids.push("google");
  if (isFacebookConfigured(env)) ids.push("facebook");
  return ids;
}

/**
 * True when sign-in can actually complete: a session secret is set. Call
 * sites branch on this the same way they branch on `isDatabaseConfigured()`
 * in lib/server/db.ts — never throw, degrade.
 *
 * PR-20: this used to also require at least one OAuth provider configured.
 * Email + password (`lib/server/auth.ts`'s Credentials provider) needs
 * nothing beyond the secret and a database — no client id, no external
 * verification — so a deployment with neither Google nor Facebook
 * provisioned still has a working sign-in path and this must say so.
 */
export function isAuthConfigured(env: AuthEnv): boolean {
  return value(env.AUTH_SECRET) !== undefined;
}

/** Human label for a provider, used in the sign-in copy. */
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  google: "Google",
  facebook: "Facebook",
};
