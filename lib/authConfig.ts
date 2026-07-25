// Auth configuration predicates (BUILD-PLAN A2).
//
// Deliberately a plain, dependency-free module rather than part of
// `lib/server/auth.ts`: these predicates decide what the UI offers, so they are
// needed on both sides of the server boundary and must be unit-testable
// without pulling in NextAuth.
//
// The rule they encode (ARCHITECTURE.md §4.2): the app runs fine with no auth
// configured at all. In that state we do not render a sign-in button that would
// 500 — we simply stay in local-only mode, which is a supported way to use the
// app, not an error.

export type ProviderId = "google" | "facebook";

export interface AuthConfigEnv {
  [key: string]: string | undefined;
  DATABASE_URL?: string;
  AUTH_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  AUTH_FACEBOOK_ENABLED?: string;
  AUTH_FACEBOOK_ID?: string;
  AUTH_FACEBOOK_SECRET?: string;
}

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function isGoogleConfigured(env: AuthConfigEnv): boolean {
  return present(env.AUTH_GOOGLE_ID) && present(env.AUTH_GOOGLE_SECRET);
}

/**
 * Facebook needs its credentials AND an explicit opt-in flag: Meta business
 * verification and app review take weeks, so the provider stays dark until
 * someone deliberately turns it on.
 */
export function isFacebookConfigured(env: AuthConfigEnv): boolean {
  return (
    env.AUTH_FACEBOOK_ENABLED === "true" &&
    present(env.AUTH_FACEBOOK_ID) &&
    present(env.AUTH_FACEBOOK_SECRET)
  );
}

export function enabledProviderIds(env: AuthConfigEnv): ProviderId[] {
  const ids: ProviderId[] = [];
  if (isGoogleConfigured(env)) ids.push("google");
  if (isFacebookConfigured(env)) ids.push("facebook");
  return ids;
}

/**
 * Accounts are available only when there is somewhere to store them, a secret
 * to sign sessions with, and at least one provider to sign in through. Missing
 * any of the three means local-only mode.
 */
export function isAuthEnabled(env: AuthConfigEnv): boolean {
  return (
    present(env.DATABASE_URL) &&
    present(env.AUTH_SECRET) &&
    enabledProviderIds(env).length > 0
  );
}

/**
 * Explains why auth is off, for the founder's benefit in logs and in the
 * sign-in screen's fallback copy. Empty when auth is on.
 */
export function authDisabledReasons(env: AuthConfigEnv): string[] {
  if (isAuthEnabled(env)) return [];
  const reasons: string[] = [];
  if (!present(env.DATABASE_URL)) reasons.push("DATABASE_URL no está configurado");
  if (!present(env.AUTH_SECRET)) reasons.push("AUTH_SECRET no está configurado");
  if (enabledProviderIds(env).length === 0) {
    reasons.push("ningún proveedor de acceso está configurado");
  }
  return reasons;
}

/**
 * Consent version. Bump when the privacy policy or terms change materially —
 * users are then asked to accept again rather than being silently carried over.
 */
export const CONSENT_VERSION = "2026-07-v1";
