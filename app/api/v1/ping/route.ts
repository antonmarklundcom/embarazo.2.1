import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isValidDepartment } from "@/lib/departments";
import { isRateLimited, clientKeyFromHeaders } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Privacy-safe aggregate analytics (build plan P1.3). Accepts ONLY the four
// non-identifying fields below — same privacy boundary as the read APIs
// (build spec §7). No cookies, no Set-Cookie, no device identifier of any
// kind is ever generated or stored. The client sends at most one "open" per
// day using a stored DATE (not an id); see lib/useAnalyticsPing.ts.
//
// The payload is forwarded fire-and-forget to ANALYTICS_WEBHOOK_URL if set.
// When that env var is unset the route is a no-op (returns 204) — the app
// runs identically with analytics off.
const BodySchema = z
  .object({
    event: z.enum(["open", "install"]),
    mode: z.enum(["embarazada", "planeando"]),
    trimester: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    department: z.string().refine(isValidDepartment).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const clientKey = clientKeyFromHeaders(req.headers);
  if (isRateLimited(`ping:${clientKey}`)) {
    return new NextResponse(null, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "cuerpo inválido" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "parámetros inválidos" }, { status: 400 });
  }

  const url = process.env.ANALYTICS_WEBHOOK_URL;
  if (url) {
    // Fire-and-forget: never await, never block, swallow failures, log nothing.
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...parsed.data, ts: Date.now() }),
      keepalive: true,
    }).catch(() => {});
  }

  return new NextResponse(null, { status: 204 });
}
