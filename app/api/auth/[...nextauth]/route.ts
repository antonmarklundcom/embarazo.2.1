import { NextResponse, type NextRequest } from "next/server";
import { isAuthEnabled } from "@/lib/authConfig";
import { handlers } from "@/lib/server/auth";

// BUILD-PLAN A2. Auth.js route handler, guarded.
//
// Auth.js requires AUTH_SECRET in production and throws without it, so with
// accounts unconfigured every call to /api/auth/session would 500 — on every
// page load, since SessionProvider polls it. A 500 is the wrong answer to
// "is anyone signed in?" when the honest answer is simply "no, this deployment
// has no accounts". So we short-circuit to a clean null session and never
// reach NextAuth.
//
// Verified by e2e (`e2e/auth-disabled.spec.ts`), which asserts a 200 here.

function disabled(): NextResponse {
  return NextResponse.json(null, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: NextRequest) {
  if (!isAuthEnabled(process.env)) return disabled();
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  if (!isAuthEnabled(process.env)) return disabled();
  return handlers.POST(req);
}
