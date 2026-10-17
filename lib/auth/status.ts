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

// Several components ask "who am I?" on the same screen (Hoy mounts two or
// three of them within a second). They share one request:
//
//  - while a request is in flight every caller gets the same promise;
//  - a request that SUCCEEDED is reused for REUSE_WINDOW_MS, so a component that
//    mounts a beat later does not ask again;
//  - a failure (network error, non-2xx, unreadable body) is never reused: the
//    next caller asks afresh.
//
// The answer can change on sign-in and sign-out, so nothing here may outlive
// either. Callers that have just signed in/out, or that need the live answer
// (a recheck after focus returns), pass `{ fresh: true }` or call
// `clearAuthStatusCache()`. `components/AccountEntryGate.tsx` is the security
// gate and deliberately does NOT use this module's cache.
export const AUTH_STATUS_REUSE_MS = 2_000;

let inflight: Promise<AuthStatus | null> | null = null;
let recent: { status: AuthStatus; at: number } | null = null;

async function requestAuthStatus(): Promise<AuthStatus | null> {
  try {
    const res = await fetch(AUTH_STATUS_PATH, { cache: "no-store" });
    if (!res.ok) return null;
    return parseAuthStatus(await res.json());
  } catch {
    return null;
  }
}

/** Forget any shared/recent answer. Call on sign-in, sign-out or revocation. */
export function clearAuthStatusCache(): void {
  inflight = null;
  recent = null;
}

/**
 * Like `fetchAuthStatus`, but `null` means "could not ask" (offline, server
 * error) instead of being folded into LOCAL_ONLY. A null is never cached.
 */
export async function fetchAuthStatusOrNull(
  options: { fresh?: boolean } = {},
): Promise<AuthStatus | null> {
  if (options.fresh) {
    clearAuthStatusCache();
  } else {
    if (recent && Date.now() - recent.at < AUTH_STATUS_REUSE_MS) return recent.status;
    if (inflight) return inflight;
  }
  const request: Promise<AuthStatus | null> = requestAuthStatus().then((status) => {
    // Only the newest request may publish: a cleared or superseded one must not
    // resurrect an answer from before the sign-in/out that cleared it.
    if (inflight === request) {
      inflight = null;
      if (status) recent = { status, at: Date.now() };
    }
    return status;
  });
  inflight = request;
  return request;
}

export async function fetchAuthStatus(options: { fresh?: boolean } = {}): Promise<AuthStatus> {
  // Neither a network failure nor missing server authenticates a first-time user.
  return (await fetchAuthStatusOrNull(options)) ?? LOCAL_ONLY;
}
