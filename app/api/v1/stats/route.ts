import { NextResponse, type NextRequest } from "next/server";

import { dbOrNull } from "@/lib/server/db";
import { popularContent, recordView } from "@/lib/server/stats";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";
import { RecordViewSchema } from "@/lib/stats/contentStats";

// BUILD-PLAN C7 — /api/v1/stats (feature map #16).
//
// POST counts one view. GET returns the most-read content of the last seven
// days. **Neither verb takes an identity and GET takes no parameters at all**,
// which is J3's rule applied to a route J3 never saw: a route that accepts
// nothing cannot transmit anything, and the Play listing keeps saying "No data
// collected" (`docs/ANDROID-LAUNCH.md` §3.1).
//
// There is deliberately no session check. This counter works for a user with no
// account, which is the majority path, and reading a session here would put an
// identity next to a counter that must never have one.
//
// With no database configured the route answers an empty list rather than
// failing: "seguir sin cuenta" and local-only deployments are supported
// configurations, and the home rail simply does not render.

export const dynamic = "force-dynamic";

const EMPTY = { popular: [] as never[] };

export async function GET(req: NextRequest) {
  for (const key of req.nextUrl.searchParams.keys()) {
    return NextResponse.json(
      { error: `parámetro no permitido: ${key}` },
      { status: 400 },
    );
  }

  const database = dbOrNull();
  if (!database) return NextResponse.json(EMPTY);

  const popular = await popularContent(database);
  return NextResponse.json(
    { popular },
    // Aggregate, identical for everybody, and a few minutes stale is fine.
    { headers: { "Cache-Control": "public, max-age=600" } },
  );
}

export async function POST(req: NextRequest) {
  // The IP is a rate-limit key held in memory for a minute. It is not written
  // anywhere, and nothing derived from it reaches the database.
  if (isRateLimited(`stats:${clientKeyFromHeaders(req.headers)}`)) {
    return new NextResponse(null, { status: 429 });
  }

  // The body is validated BEFORE the database is looked at, deliberately: the
  // whitelist is a promise about what this route accepts, and a deployment with
  // no database must not quietly accept a request carrying a week.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }

  const parsed = RecordViewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }

  const database = dbOrNull();
  // Nothing to count against, and nothing for the caller to do about it.
  if (database) await recordView(database, parsed.data.contentId);

  // No body: there is nothing to tell the caller, and a count is not news.
  return new NextResponse(null, { status: 204 });
}
