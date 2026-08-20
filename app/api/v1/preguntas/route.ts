import { NextResponse, type NextRequest } from "next/server";

import {
  CHEAP_READ_LIMIT,
  clientKeyFromHeaders,
  isRateLimited,
} from "@/lib/rateLimit";
import { dbOrNull } from "@/lib/server/db";
import { approvedQuestions } from "@/lib/server/questions";

// K20 — the published Q&A. Public, parameterless, identical for everyone.
//
// **This route does not read the session, and that is a design constraint
// rather than an accident of what it happens to need.** Submitting a question
// and reading your own question's status live at `/api/v1/mis-preguntas`,
// which is a separate path precisely so this one can be cached.
//
// The rule being obeyed is K14's, which `lib/invariants/swCache.test.ts`
// enforces from the source: a route whose handler reads a session is
// `NetworkOnly` in the service worker, forever, no exceptions argued
// case-by-case. Putting a `POST` that needs a session on this path would drag
// the public GET into `SESSION_BEARING_API` with it — and `/preguntas` would
// stop working offline, which is the one thing K20 asks of it ("precached like
// other content").
//
// Parameterless for K5's reason as well: a route that takes nothing caches
// under one key for every reader in the country.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (
    isRateLimited(
      `preguntas:${clientKeyFromHeaders(req.headers)}`,
      Date.now(),
      CHEAP_READ_LIMIT,
    )
  ) {
    return NextResponse.json({ error: "demasiadas solicitudes" }, { status: 429 });
  }

  // Reject unexpected parameters rather than ignoring them — the same reason
  // `/directory` does. A silently-accepted `?userId=` is a query surface
  // somebody will eventually implement.
  for (const key of req.nextUrl.searchParams.keys()) {
    return NextResponse.json(
      { error: `parámetro no permitido: ${key}` },
      { status: 400 },
    );
  }

  const database = dbOrNull();
  // No database configured is the local-only mode ARCHITECTURE.md §4.2
  // protects: an empty list, not a 500. The page renders its static FAQ and
  // simply has no community section.
  if (!database) return NextResponse.json({ questions: [] });

  const questions = await approvedQuestions(database);

  return NextResponse.json(
    { questions },
    {
      // Ten minutes, shared. The content changes when an admin answers
      // something, which is not an event anybody is waiting on to the second.
      headers: { "Cache-Control": "public, max-age=600" },
    },
  );
}
