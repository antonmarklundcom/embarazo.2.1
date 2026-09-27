import { NextResponse, type NextRequest } from "next/server";

import { dbOrNull } from "@/lib/server/db";
import { recordFunnel } from "@/lib/server/funnelStats";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";
import { FunnelEventSchema } from "@/lib/stats/funnel";

// Growth plan items 16–18 — POST one bare increment of the install funnel.
//
// The same contract as `/api/v1/stats`: no session is read (this works for the
// majority who never make an account, and a session here would put an identity
// next to a counter that must never have one), the IP is a rate-limit key held
// in memory for a minute and written nowhere, and the body is `.strict()` so a
// field nobody designed is a 400 on first contact. There is no GET: the
// numbers are read on `/admin/metricas`, behind the admin check.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (isRateLimited(`funnel:${clientKeyFromHeaders(req.headers)}`)) {
    return new NextResponse(null, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }

  const parsed = FunnelEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }

  const database = dbOrNull();
  if (database) {
    await recordFunnel(database, parsed.data);
  }
  return new NextResponse(null, { status: 204 });
}
