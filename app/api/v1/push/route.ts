import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/server/auth";
import { dbOrNull } from "@/lib/server/db";
import {
  deleteSubscription,
  isPushConfigured,
  publicVapidKey,
  saveSubscription,
  scheduleReminders,
} from "@/lib/server/push";
import { PUSH_CATEGORIES } from "@/lib/push/categories";
import { isAllowedPushEndpoint } from "@/lib/push/endpoints";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";

// BUILD-PLAN B5 — subscribe, schedule, unsubscribe.
//
// **No session required.** A push endpoint is anonymous by construction and
// the standing rule is that the app works without an account; requiring one
// here would put the biggest retention feature behind the account system for
// no technical reason. When there IS a session the subscription is linked to
// it, so account deletion takes the subscription with it (A5).
//
// What this route will accept, in full: an endpoint, its two keys, a list of
// categories, and a list of epoch-millisecond times to poke it. There is
// deliberately no field for a message, a title, a week or an appointment —
// the service worker composes what it shows from IndexedDB, so there is
// nothing for a client to send and nothing for the server to store.

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" } as const;

/** Bounds the schedule so one request cannot enqueue a year of pokes. */
const MAX_REMINDERS = 60;
const MAX_SCHEDULE_AHEAD_MS = 400 * 24 * 60 * 60 * 1000;

const SubscriptionSchema = z
  .object({
    // K14: the host is whitelisted here, not merely parsed. This value is
    // stored and later fetched by our own server on a schedule — an
    // unvalidated one is a persistent SSRF, not a bad link.
    endpoint: z.string().url().max(512).refine(isAllowedPushEndpoint, {
      message: "endpoint no es un servicio de push conocido",
    }),
    keys: z
      .object({
        p256dh: z.string().min(1).max(255),
        auth: z.string().min(1).max(255),
      })
      .strict(),
    categories: z.array(z.enum(PUSH_CATEGORIES)).max(PUSH_CATEGORIES.length),
    /** Epoch ms. The server learns WHEN to poke, never what about. */
    reminders: z
      .array(z.number().int().positive())
      .max(MAX_REMINDERS)
      .optional(),
  })
  .strict();

const UnsubscribeSchema = z
  .object({
    endpoint: z.string().url().max(512).refine(isAllowedPushEndpoint, {
      message: "endpoint no es un servicio de push conocido",
    }),
  })
  .strict();

function unavailable() {
  return NextResponse.json(
    { error: "notificaciones no disponibles" },
    { status: 404, headers: HEADERS },
  );
}

/** The browser needs the public key before it can subscribe. */
export async function GET() {
  const key = publicVapidKey();
  if (!key) return unavailable();
  return NextResponse.json({ publicKey: key }, { headers: HEADERS });
}

function throttled(req: NextRequest) {
  // K14: this route takes an anonymous write, so it is the one place in the
  // app where "no session" and "writes to the database" meet. The sync
  // pattern, keyed per route so a device syncing hard cannot lock itself out
  // of its own notifications.
  if (isRateLimited(`push:${clientKeyFromHeaders(req.headers)}`)) {
    return NextResponse.json(
      { error: "demasiadas solicitudes" },
      { status: 429, headers: HEADERS },
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!isPushConfigured()) return unavailable();
  const limited = throttled(req);
  if (limited) return limited;
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

  const parsed = SubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "suscripción inválida" },
      { status: 400, headers: HEADERS },
    );
  }

  const { endpoint, keys, categories, reminders } = parsed.data;

  // A session links the subscription to an account when there is one, so A5's
  // deletion removes it. Its absence is not an error.
  const session = await getSession();

  await saveSubscription(database, {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    categories,
    userId: session?.user?.id ?? null,
  });

  if (reminders) {
    const now = Date.now();
    const bounded = reminders.filter(
      (at) => at > now - 60_000 && at < now + MAX_SCHEDULE_AHEAD_MS,
    );
    // Only `recordatorios` is device-scheduled today; the other categories are
    // broadcast (I5) and have nothing per-device to enqueue.
    await scheduleReminders(database, endpoint, "recordatorios", bounded);
  }

  return NextResponse.json({ ok: true }, { headers: HEADERS });
}

export async function DELETE(req: NextRequest) {
  if (!isPushConfigured()) return unavailable();
  const limited = throttled(req);
  if (limited) return limited;
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

  const parsed = UnsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "endpoint inválido" },
      { status: 400, headers: HEADERS },
    );
  }

  // Deliberately not session-guarded: whoever holds the endpoint is the device
  // it belongs to, and the worst an attacker can do with a stolen endpoint is
  // stop notifications they were never receiving. Requiring a session would
  // strand every anonymous subscription with no way to turn it off.
  await deleteSubscription(database, parsed.data.endpoint);

  return NextResponse.json({ ok: true }, { headers: HEADERS });
}
