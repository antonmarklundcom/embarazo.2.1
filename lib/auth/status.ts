import { PROVIDER_IDS, type ProviderId } from "./config";

// Unrecognised responses fail closed: no session and account still required.
// An offline returning user may separately open only their account-bound records.

export const AUTH_STATUS_PATH = "/api/v1/auth-status";

export interface AuthStatus {
  providers: ProviderId[];
  /** PR-20 — true once email + password sign-in can complete (secret + db). */
  credentialsAvailable: boolean;
  signedIn: boolean;
  accountRequired: boolean;
  /** The caller's own identifier, used only to compare local-record ownership. */
  accountId: string | null;
}

/** Historical export name: an unavailable server never grants guest tracking. */
export const LOCAL_ONLY: AuthStatus = {
  providers: [],
  credentialsAvailable: false,
  signedIn: false,
  accountRequired: true,
  accountId: null,
};

export function parseAuthStatus(body: unknown): AuthStatus {
  if (typeof body !== "object" || body === null) return LOCAL_ONLY;
  const raw = body as {
    providers?: unknown;
    credentialsAvailable?: unknown;
    signedIn?: unknown;
    accountRequired?: unknown;
    accountId?: unknown;
  };
  const providers = Array.isArray(raw.providers)
    ? raw.providers.filter((id): id is ProviderId =>
        (PROVIDER_IDS as readonly unknown[]).includes(id),
      )
    : [];
  return {
    providers,
    credentialsAvailable: raw.credentialsAvailable === true,
    signedIn: raw.signedIn === true,
    accountRequired: raw.accountRequired !== false,
    accountId: raw.signedIn === true && typeof raw.accountId === "string" && raw.accountId.trim().length > 0 && raw.accountId.length <= 128 ? raw.accountId : null,
  };
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  try {
    const res = await fetch(AUTH_STATUS_PATH, { cache: "no-store" });
    if (!res.ok) return LOCAL_ONLY;
    return parseAuthStatus(await res.json());
  } catch {
    // Neither a network failure nor missing server authenticates a first-time user.
    return LOCAL_ONLY;
  }
}
