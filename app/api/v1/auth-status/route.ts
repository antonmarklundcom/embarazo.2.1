import { NextResponse, type NextRequest } from "next/server";

import { availableProviders, getSession, isAuthAvailable } from "@/lib/server/auth";
import { requiresAccount } from "@/lib/auth/access";
import {
  CHEAP_READ_LIMIT,
  clientKeyFromHeaders,
  isRateLimited,
} from "@/lib/rateLimit";

// BUILD-PLAN K1 — "can this device create an account, and does it already have
// one?", answered to a client component.
//
// Onboarding is rendered inside `app/(app)/page.tsx`, which is a client
// component, so it cannot call `getSession()` or read `process.env`. The two
// alternatives were both worse:
//
//  • A `NEXT_PUBLIC_AUTH_ENABLED` flag inlined at build time. It would be a
//    second source of truth for something `isAuthAvailable()` already decides,
//    and the day they disagree the onboarding shows a Google button that
//    cannot work — on a screen where the user has nowhere else to go.
//  • Mounting `next-auth/react`'s SessionProvider in the app shell, which puts
//    the client half of Auth.js into every page's bundle for one boolean
//    (G3 has a First Load JS budget to defend).
//
// One route reports configured login methods, session and local ownership identity.
//
// **What it discloses.** Which providers a deployment has configured — already
// visible on `/cuenta` to anyone who opens it — and whether *the caller's own*
// cookie is a live session. The accountId is exclusively the caller's own id,
// allowing the gate to refuse another account's local records. It returns no
// name, email, avatar or health data and never accepts a user id as input.
//
// It takes no parameters, like every other route under /api/v1 since J3, and a
// request carrying one is rejected rather than ignored.

export const dynamic = "force-dynamic";

const HEADERS = {
  // Per-caller by definition. This answer must never sit in a shared cache, or
  // in the service worker's, where it would outlive a sign-out.
  "Cache-Control": "no-store",
} as const;

export async function GET(req: NextRequest) {
  // K14: throttled like every other session-reading route. This one is cheap,
  // but it is the route that answers "is this cookie live?", and an unmetered
  // oracle for that is worth a limiter even when the answer is one boolean.
  if (isRateLimited(`auth-status:${clientKeyFromHeaders(req.headers)}`, Date.now(), CHEAP_READ_LIMIT)) {
    return NextResponse.json(
      { error: "demasiadas solicitudes" },
      { status: 429, headers: HEADERS },
    );
  }

  for (const key of req.nextUrl.searchParams.keys()) {
    return NextResponse.json(
      { error: `parámetro no permitido: ${key}` },
      { status: 400, headers: HEADERS },
    );
  }

  const providers = availableProviders();
  // `getSession()` returns null without touching cookies when auth is
  // unconfigured, so this stays cheap and safe in local-only mode.
  const session = await getSession();

  return NextResponse.json(
    {
      providers,
      // PR-20 — email + password needs no provider-specific config, so it is
      // reported alongside but separately from the OAuth `providers` list.
      credentialsAvailable: isAuthAvailable(),
      signedIn: Boolean(session?.user?.id),
      accountRequired: requiresAccount(process.env),
      accountId: session?.user?.id ?? null,
    },
    { headers: HEADERS },
  );
}
