import { NextResponse, type NextRequest } from "next/server";

import { findQuestion, isPublishedAnswer, PollAnswerSchema } from "@/lib/poll/dailyPoll";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";
import { dbOrNull } from "@/lib/server/db";
import { recordPollAnswer } from "@/lib/server/poll";

// "Pregunta del día" — POST /api/v1/poll counts one answer.
//
// The body is `{ questionId, optionKey, week? }`, `.strict()`, and the pair
// must be published in lib/seed/py/dailyQuestions.json; anything else is a
// 400. That whitelist is what keeps the anonymous counter from becoming a
// free-form store: the only ids this route can write are
// `poll-<published question>-<published option>`.
//
// Same privacy shape as /api/v1/stats, deliberately: no session is read, no
// identity is written, the IP is an in-memory rate-limit key for a minute, and
// the row is (week, id, day, count). Which button she tapped is never sent
// with anything that could tie it to her; her own copy stays on the device.
//
// The read side is /api/v1/poll/<questionId> (./[questionId]/route.ts).

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (isRateLimited(`poll:${clientKeyFromHeaders(req.headers)}`)) {
    return new NextResponse(null, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }

  const parsed = PollAnswerSchema.safeParse(body);
  if (
    !parsed.success ||
    !isPublishedAnswer(parsed.data.questionId, parsed.data.optionKey)
  ) {
    return NextResponse.json({ error: "pregunta o respuesta desconocida" }, { status: 400 });
  }

  const database = dbOrNull();
  if (database) {
    await recordPollAnswer(
      database,
      findQuestion(parsed.data.questionId)!,
      parsed.data.optionKey,
      parsed.data.week ?? null,
    );
  }

  return new NextResponse(null, { status: 204 });
}
