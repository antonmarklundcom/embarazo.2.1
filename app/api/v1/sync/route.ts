import { NextResponse, type NextRequest } from "next/server";

import { getSession, isAuthAvailable } from "@/lib/server/auth";
import { dbOrNull } from "@/lib/server/db";
import { drizzleBackend, pullRecords, pushRecords } from "@/lib/server/sync";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";
import {
  PULL_ALLOWED_PARAMS,
  PullQuerySchema,
  PushRequestSchema,
} from "@/lib/sync/protocol";

// BUILD-PLAN A3 — /api/v1/sync.
//
// POST pushes local records, GET pulls everything changed since a cursor.
// Both are per-user and require a session; there is no anonymous sync and no
// way to name another user's records — the user id comes from the session,
// never from the request body.
//
// In a deployment with no account system configured, this route 404s rather
// than 500s, matching /api/auth/* (A2). "Seguir sin cuenta" is a supported
// configuration, not a broken one.

export const dynamic = "force-dynamic";

function notConfigured(): NextResponse {
  return NextResponse.json({ error: "sync no disponible" }, { status: 404 });
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "sesión requerida" }, { status: 401 });
}

/** Never cache, never set a cookie of our own. */
const HEADERS = { "Cache-Control": "no-store" } as const;

async function context(req: NextRequest) {
  if (!isAuthAvailable()) return { error: notConfigured() } as const;

  if (isRateLimited(`sync:${clientKeyFromHeaders(req.headers)}`)) {
    return {
      error: NextResponse.json(
        { error: "demasiadas solicitudes" },
        { status: 429, headers: HEADERS },
      ),
    } as const;
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return { error: unauthorized() } as const;

  const database = dbOrNull();
  if (!database) return { error: notConfigured() } as const;

  return { userId, database } as const;
}

export async function POST(req: NextRequest) {
  const ctx = await context(req);
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "cuerpo inválido" },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = PushRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "registros inválidos", detail: parsed.error.issues[0]?.message },
      { status: 400, headers: HEADERS },
    );
  }

  const result = await pushRecords(
    drizzleBackend(ctx.database),
    ctx.userId,
    parsed.data.records,
    Date.now(),
  );

  return NextResponse.json(result, { headers: HEADERS });
}

export async function GET(req: NextRequest) {
  const ctx = await context(req);
  if ("error" in ctx) return ctx.error;

  const params = req.nextUrl.searchParams;
  for (const key of params.keys()) {
    if (!PULL_ALLOWED_PARAMS.has(key)) {
      return NextResponse.json(
        { error: `parámetro no permitido: ${key}` },
        { status: 400, headers: HEADERS },
      );
    }
  }

  const parsed = PullQuerySchema.safeParse({
    since: params.get("since") ?? 0,
    limit: params.get("limit") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "parámetros inválidos" },
      { status: 400, headers: HEADERS },
    );
  }

  const result = await pullRecords(
    drizzleBackend(ctx.database),
    ctx.userId,
    parsed.data,
    Date.now(),
  );

  return NextResponse.json(result, { headers: HEADERS });
}
