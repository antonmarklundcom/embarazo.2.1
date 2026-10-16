import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { refuseCrossSite, refuseOtherAccount } from "@/lib/server/requestGuard";
import { getSession } from "@/lib/server/auth";
import { dbOrNull } from "@/lib/server/db";
import { isPushConfigured, sendTestPoke } from "@/lib/server/push";
import { drizzlePushBackend } from "@/lib/server/pushBackend";
import { isAllowedPushEndpoint } from "@/lib/push/endpoints";
import { PUSH_TEST_DELAYS_MS } from "@/lib/push/testNotice";
import { isRateLimited } from "@/lib/rateLimit";

// Owner acceptance — "Probar avisos" in Ajustes.
//
// One poke, with no body, to a device this account already subscribed. It is
// how a real phone proves receipt, the tap destination and the opt-out without
// waiting for a week to turn over or editing a real control. The delayed form
// gives her time to close the app first, which is the case that matters: a
// notification that only arrives while the app is open proves very little.
//
// Unlike the subscribe route, a session is required. A test that anyone could
// aim at a stored endpoint would be a free way to buzz somebody's phone.

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" } as const;

/** Per account, per minute: enough to retry, not enough to be a buzzer. */
const TEST_LIMIT_PER_MINUTE = 3;

const TestSchema = z
  .object({
    endpoint: z.string().url().max(512).refine(isAllowedPushEndpoint, {
      message: "endpoint no es un servicio de push conocido",
    }),
    delayMs: z
      .number()
      .int()
      .refine((value) => (PUSH_TEST_DELAYS_MS as readonly number[]).includes(value))
      .default(0),
  })
  .strict();

function reply(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

export async function POST(req: NextRequest) {
  if (!isPushConfigured()) return reply(404, { error: "notificaciones no disponibles" });
  const crossSite = refuseCrossSite(req);
  if (crossSite) return crossSite;

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return reply(401, { error: "sin sesión", reason: "signed-out" });
  const otherAccount = refuseOtherAccount(req, userId);
  if (otherAccount) return otherAccount;

  if (isRateLimited(`push-test:${userId}`, Date.now(), TEST_LIMIT_PER_MINUTE)) {
    return reply(429, { error: "demasiadas pruebas", reason: "rate-limited" });
  }

  const database = dbOrNull();
  if (!database) return reply(404, { error: "notificaciones no disponibles" });
  const backend = drizzlePushBackend(database);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "cuerpo inválido" });
  }
  const parsed = TestSchema.safeParse(body);
  if (!parsed.success) return reply(400, { error: "prueba inválida" });
  const { endpoint, delayMs } = parsed.data;

  // Ownership is checked now, in the request, so the answer she sees is true
  // even for the delayed form.
  const owned = await backend.subscriptionEndpointsOf(userId);
  if (!owned.includes(endpoint)) {
    return reply(404, { error: "este teléfono no tiene avisos activos", reason: "not-subscribed" });
  }

  if (delayMs > 0) {
    // Best-effort by design: a restart in the next few seconds loses one test
    // poke, which she can simply send again. Nothing is queued in the database.
    after(async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await sendTestPoke(backend, userId, endpoint, Date.now()).catch(() => undefined);
    });
    return reply(202, { ok: true, scheduled: true });
  }

  const outcome = await sendTestPoke(backend, userId, endpoint, Date.now());
  switch (outcome) {
    case "sent":
      return reply(200, { ok: true });
    case "not-subscribed":
      return reply(404, { error: "este teléfono no tiene avisos activos", reason: "not-subscribed" });
    case "gone":
      return reply(410, { error: "suscripción vencida", reason: "gone" });
    case "unconfigured":
      return reply(404, { error: "notificaciones no disponibles" });
    default:
      return reply(502, { error: "el servicio de avisos no respondió", reason: "failed" });
  }
}
