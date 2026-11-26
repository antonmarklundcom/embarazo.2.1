import { NextResponse, type NextRequest } from "next/server";

import { findQuestion, tallyByTrimester } from "@/lib/poll/dailyPoll";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";
import { dbOrNull } from "@/lib/server/db";
import { pollResults } from "@/lib/server/poll";

// "Pregunta del día" — GET /api/v1/poll/<questionId>: how everybody answered.
//
// It takes the question id and NOTHING else: no week, no trimester, no query
// parameter (any one is a 400), no session. The answer is the counts per
// option for each of the three trimesters, summed over all days, identical for
// everybody, and the card picks her trimester on the device. Same rule as the
// "lo más leído" GET (lib/stats/contentStats.ts): the read side receives
// nothing about the reader, so it has one cache key per question and never a
// health datum in a URL.

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> },
) {
  // The IP is an in-memory rate-limit key for a minute, as on every route.
  if (isRateLimited(`poll-read:${clientKeyFromHeaders(req.headers)}`)) {
    return new NextResponse(null, { status: 429 });
  }
  for (const key of req.nextUrl.searchParams.keys()) {
    return NextResponse.json({ error: `parámetro no permitido: ${key}` }, { status: 400 });
  }

  const { questionId } = await params;
  const question = findQuestion(questionId);
  if (!question) {
    return NextResponse.json({ error: "pregunta desconocida" }, { status: 400 });
  }

  const database = dbOrNull();
  // No database: zeros, which the card shows as "todavía pocas respuestas".
  if (!database) return NextResponse.json(tallyByTrimester(question, []));

  return NextResponse.json(await pollResults(database, question), {
    // Aggregate, identical for everybody, and a few minutes stale is fine.
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
