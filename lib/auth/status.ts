import { PROVIDER_IDS, type ProviderId } from "./config";

// BUILD-PLAN K1 — the client half of /api/v1/auth-status.
//
// `parseAuthStatus` is separate from the fetch so the interesting half is
// testable: the app must degrade to "no accounts here" for *any* answer it does
// not recognise — an offline first run, a 404 from a local-only build, an HTML
// error page from a proxy. Guessing that accounts work when they do not would
// strand a user on a sign-in button that goes nowhere.

export const AUTH_STATUS_PATH = "/api/v1/auth-status";

export interface AuthStatus {
  providers: ProviderId[];
  signedIn: boolean;
}

/** What we assume when we could not find out: a local-only, signed-out device. */
export const LOCAL_ONLY: AuthStatus = { providers: [], signedIn: false };

export function parseAuthStatus(body: unknown): AuthStatus {
  if (typeof body !== "object" || body === null) return LOCAL_ONLY;
  const raw = body as { providers?: unknown; signedIn?: unknown };
  const providers = Array.isArray(raw.providers)
    ? raw.providers.filter((id): id is ProviderId =>
        (PROVIDER_IDS as readonly unknown[]).includes(id),
      )
    : [];
  return { providers, signedIn: raw.signedIn === true };
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  try {
    const res = await fetch(AUTH_STATUS_PATH, { cache: "no-store" });
    if (!res.ok) return LOCAL_ONLY;
    return parseAuthStatus(await res.json());
  } catch {
    // Offline, or a build with no server. Both are supported states.
    return LOCAL_ONLY;
  }
}
