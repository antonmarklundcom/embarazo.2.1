import "server-only";

import { NextResponse } from "next/server";

// Two checks every cookie-authenticated mutation in /api/v1 runs before it
// reads its body. Per handler, like the session check itself: this app has no
// middleware on purpose (lib/invariants/middleware.test.ts).
//
// F08 — cross-site request forgery from a SAME-SITE origin. `com.py` is a
// public suffix, so `embarazo.com.py` and `app.embarazo.com.py` are the same
// site: Auth.js's `SameSite=Lax` session cookie rides along on a no-cors
// `text/plain` POST from any page on the root domain or another subdomain, and
// the handlers parsed that body as JSON. Reproduced in Chromium: a page on the
// root domain wiped a user's photo index. Server actions have Next's own origin
// check; these handlers had none.
//
// F01 — a request may say which account this phone's data belongs to
// (`X-Mibebe-Account`, lib/sync/client.ts). The client checks the link before
// sending, but a cookie can change between that check and the upload; a stated
// account that is not the session's is refused here. The header is optional so
// clients that predate it keep working.

export const ACCOUNT_HEADER = "x-mibebe-account";

const HEADERS = { "Cache-Control": "no-store" } as const;

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Hosts this app is served from, as the request and the deployment say. */
function ownHosts(req: Request): Set<string> {
  const hosts = new Set<string>();
  for (const value of [req.headers.get("x-forwarded-host"), req.headers.get("host")]) {
    // A proxy may send a list; the first entry is the client-facing host.
    const first = value?.split(",")[0]?.trim().toLowerCase();
    if (first) hosts.add(first);
  }
  for (const configured of [process.env.NEXT_PUBLIC_APP_URL, process.env.AUTH_URL]) {
    const host = hostOf(configured?.trim());
    if (host) hosts.add(host);
  }
  return hosts;
}

/**
 * Refuse a mutation that did not come from this app's own pages, or whose body
 * is not declared JSON. Returns the response to send, or null to proceed.
 *
 * `Sec-Fetch-Site` decides when the browser sends it (every current engine;
 * the Android TWA is Chrome). Without it, the `Origin` host must be one of
 * ours. A request with neither — not a browser — is left to the session check:
 * without the user's cookie it is nobody.
 */
export function refuseCrossSite(req: Request): NextResponse | null {
  const site = req.headers.get("sec-fetch-site");
  if (site) {
    if (site !== "same-origin" && site !== "none") return forbidden();
  } else {
    const origin = req.headers.get("origin");
    if (origin) {
      const host = hostOf(origin);
      if (!host || !ownHosts(req).has(host)) return forbidden();
    }
  }

  const type = req.headers.get("content-type") ?? "";
  if (!/^application\/json(\s*;|$)/i.test(type.trim())) {
    return NextResponse.json(
      { error: "se espera JSON" },
      { status: 415, headers: HEADERS },
    );
  }
  return null;
}

/** F01: refuse a request that says it is sending another account's data. */
export function refuseOtherAccount(req: Request, userId: string): NextResponse | null {
  const stated = req.headers.get(ACCOUNT_HEADER);
  if (stated === null || stated === "" || stated === userId) return null;
  return NextResponse.json(
    { error: "otra cuenta", reason: "account-mismatch" },
    { status: 409, headers: HEADERS },
  );
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "origen no permitido" }, { status: 403, headers: HEADERS });
}
