import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { dbOrNull } from "@/lib/server/db";
import { isPushConfigured, rotateSubscription } from "@/lib/server/push";
import { drizzlePushBackend } from "@/lib/server/pushBackend";
import { isAllowedPushEndpoint } from "@/lib/push/endpoints";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";
import { refuseCrossSite } from "@/lib/server/requestGuard";
import { AccountWriteDenied, withAccountWrite } from "@/lib/server/accountWrite";

// `pushsubscriptionchange` — the push service replaced this browser's
// subscription, and the service worker (app/sw.ts) is telling us which
// endpoint became which. Without it reminders stop until she next opens the app
// (`refreshWeeklyTips` re-posts on start), which for a reminder about a control
// the next morning is too late.
//
// **No session required, and none is read.** The service worker runs with no
// page and often no signed-in context, and a subscription can be anonymous.
// The proof of ownership is the OLD endpoint: it is an unguessable URL that
// only the browser it was issued to (and our own database) holds, and it must
// already be stored for anything to happen. This is the same reasoning as
// DELETE in `../route.ts` — whoever holds the endpoint is the device it belongs
// to — and the worst a thief of an old endpoint could do is move that one
// device's schedule to another endpoint, which both must pass the push-host
// whitelist and which would then be the thief's own, not the victim's. The
// owner (`userId`) and the category opt-ins are carried over from the stored
// row, never taken from the request, so this route cannot assign an account.
//
// Accepts exactly: the old endpoint, the new endpoint, and the new keys. No
// message, no time, no category.

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" } as const;

const endpointField = z
  .string()
  .url()
  .max(512)
  // K14: both hosts are whitelisted. The new one is stored and later fetched by
  // our own server (SSRF if unchecked); the old one is a database key.
  .refine(isAllowedPushEndpoint, {
    message: "endpoint no es un servicio de push conocido",
  });

const RotateSchema = z
  .object({
    oldEndpoint: endpointField,
    endpoint: endpointField,
    keys: z
      .object({
        p256dh: z.string().min(1).max(255),
        auth: z.string().min(1).max(255),
      })
      .strict(),
  })
  .strict();

function unavailable() {
  return NextResponse.json(
    { error: "notificaciones no disponibles" },
    { status: 404, headers: HEADERS },
  );
}

export async function POST(req: NextRequest) {
  if (!isPushConfigured()) return unavailable();
  // F08: a service-worker fetch to its own origin sends `Sec-Fetch-Site:
  // same-origin` (and `Origin` on a POST), which `refuseCrossSite` accepts; it
  // also requires the JSON content type the worker sets.
  const crossSite = refuseCrossSite(req);
  if (crossSite) return crossSite;
  // K14: an anonymous write, keyed per route so a rotation burst cannot lock a
  // device out of subscribing or unsubscribing.
  if (isRateLimited(`push-rotate:${clientKeyFromHeaders(req.headers)}`)) {
    return NextResponse.json(
      { error: "demasiadas solicitudes" },
      { status: 429, headers: HEADERS },
    );
  }
  const database = dbOrNull();
  if (!database) return unavailable();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "cuerpo inválido" },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = RotateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "suscripción inválida" },
      { status: 400, headers: HEADERS },
    );
  }

  const { oldEndpoint, endpoint, keys } = parsed.data;
  const backend = drizzlePushBackend(database);
  const stored = await Promise.all([backend.subscriptionOf(oldEndpoint), backend.subscriptionOf(endpoint)]);
  const owners = [...new Set(stored.map((row) => row?.userId).filter((id): id is string => Boolean(id)))];
  let outcome: "rotated" | "unknown";
  try {
  outcome = await withAccountWrite(database, owners, (transaction) => rotateSubscription(
    drizzlePushBackend(transaction, owners),
    oldEndpoint,
    { endpoint, p256dh: keys.p256dh, auth: keys.auth },
    Date.now(),
  ));
  } catch (error) {
    if (error instanceof AccountWriteDenied) return NextResponse.json({ error: "cuenta no disponible" }, { status: 401, headers: HEADERS });
    throw error;
  }

  // "unknown" is not an error: the server never knew that device, and the
  // app's start-up refresh will subscribe it the ordinary way.
  return NextResponse.json({ ok: true, rotated: outcome === "rotated" }, { headers: HEADERS });
}
