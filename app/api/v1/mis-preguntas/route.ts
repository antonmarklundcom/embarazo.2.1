import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";
import { dbOrNull } from "@/lib/server/db";
import { getSession, isAuthAvailable } from "@/lib/server/auth";
import { questionsOf, submitQuestion } from "@/lib/server/questions";
import { questionSchema } from "@/lib/community/questions";

// K20 — asking a question, and seeing what happened to it.
//
// A separate path from `/api/v1/preguntas` on purpose. Both halves of this
// route read the session, which under K14's rule makes the whole path
// `NetworkOnly` in the service worker (`SESSION_BEARING_API` covers
// `mis-preguntas`). Keeping the public list on its own path is what lets it
// stay cached and keeps `/preguntas` readable offline.
//
// The split has a second effect worth naming: there is no code path here that
// can return somebody else's question. `questionsOf` takes a userId and the
// only userId available is the session's.

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" } as const;

const SubmitSchema = z.object({ question: questionSchema }).strict();

/** Her own questions and their status. Never anybody else's, at any status. */
export async function GET() {
  if (!isAuthAvailable()) return NextResponse.json({ questions: [] }, { headers: HEADERS });

  const session = await getSession();
  const userId = session?.user?.id;
  // Signed out is an empty list, not a 401: "Seguir sin cuenta" is a supported
  // way to use this app, and the page asks for this list before it knows
  // whether anyone is signed in.
  if (!userId) return NextResponse.json({ questions: [] }, { headers: HEADERS });

  const database = dbOrNull();
  if (!database) return NextResponse.json({ questions: [] }, { headers: HEADERS });

  return NextResponse.json(
    { questions: await questionsOf(database, userId) },
    { headers: HEADERS },
  );
}

export async function POST(req: NextRequest) {
  if (!isAuthAvailable()) {
    return NextResponse.json(
      { error: "necesitás una cuenta para preguntar" },
      { status: 401, headers: HEADERS },
    );
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "necesitás una cuenta para preguntar" },
      { status: 401, headers: HEADERS },
    );
  }

  // Two limiters, deliberately, and they answer different questions. This one
  // is per-connection and stops a flood; `submitQuestion`'s per-account daily
  // cap is the one that means "this person is asking too much". In Paraguay a
  // household or a locutorio behind one address is normal, so an IP cap alone
  // would throttle a neighbourhood.
  if (isRateLimited(`preguntar:${clientKeyFromHeaders(req.headers)}`, Date.now(), 20)) {
    return NextResponse.json(
      { error: "demasiadas solicitudes" },
      { status: 429, headers: HEADERS },
    );
  }

  const parsed = SubmitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "revisá tu pregunta" },
      { status: 400, headers: HEADERS },
    );
  }

  const database = dbOrNull();
  if (!database) {
    return NextResponse.json(
      { error: "no disponible por ahora" },
      { status: 503, headers: HEADERS },
    );
  }

  const result = await submitQuestion(database, userId, parsed.data.question);
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          "Ya nos mandaste varias preguntas hoy. Esperá a que respondamos esas y volvé mañana.",
      },
      { status: 429, headers: HEADERS },
    );
  }

  return NextResponse.json({ ok: true, id: result.id }, { headers: HEADERS });
}
