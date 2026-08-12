// BUILD-PLAN A7 — who is an administrator.
//
// Pure and env-as-argument, following `lib/auth/config.ts`: nothing reads
// `process.env` at module scope, nothing throws at import, and the rule is
// unit-testable without a database.
//
// `ADMIN_EMAILS` exists to solve a chicken-and-egg problem. `users.role` is
// the source of truth for access, but nobody can grant the first admin role
// through a panel that is itself admin-gated. The allowlist promotes matching
// accounts at sign-in, so the first administrator exists the moment the
// founder signs in with their own address.

export type AdminEnv = { readonly [key: string]: string | undefined };

/**
 * Parse `ADMIN_EMAILS` — comma-separated, whitespace-tolerant, lowercased.
 *
 * Returns an empty list when unset, which is the correct default: a
 * deployment nobody configured has no administrators, not all of them.
 */
export function adminEmails(env: AdminEnv): string[] {
  const raw = env.ADMIN_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0 && entry.includes("@"));
}

/**
 * True when this address should hold the admin role.
 *
 * Email comparison is case-insensitive because providers are inconsistent
 * about the case they return, and an allowlist that silently fails to match
 * `Founder@Gmail.com` is an allowlist that appears broken rather than strict.
 */
export function isAdminEmail(
  email: string | null | undefined,
  env: AdminEnv,
): boolean {
  const normalised = email?.trim().toLowerCase();
  if (!normalised) return false;
  return adminEmails(env).includes(normalised);
}
