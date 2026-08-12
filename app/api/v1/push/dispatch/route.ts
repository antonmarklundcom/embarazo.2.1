import { NextResponse, type NextRequest } from "next/server";

import { dbOrNull } from "@/lib/server/db";
import {
  dispatchDueReminders,
  isPushConfigured,
  pruneSentReminders,
} from "@/lib/server/push";

// BUILD-PLAN B5 — the thing a scheduler calls.
//
// Hostinger's cron (or any uptime pinger) hits this every few minutes with the
// shared secret. It sends every reminder whose `fireAt` has passed, which is
// how "a control reminder fires the day before" actually happens: the device
// scheduled the time, this route notices it has arrived, and the service
// worker writes the sentence.
//
// Guarded by a shared secret rather than a session because the caller is a
// machine. Without `PUSH_DISPATCH_SECRET` set the route does not exist at all
// — an unguarded dispatcher is a free way for anyone to drain a push quota.

export const dynamic = "force-dynamic";

/** Sent reminders older than this are forgotten on each run. */
const PRUNE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

function timingSafeEqual(a: string, b: string): boolean {
  // Equal-length comparison without an early return. The secret is a bearer
  // token, so leaking its length via timing is not interesting, but leaking
  // its prefix would be.
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const secret = process.env.PUSH_DISPATCH_SECRET?.trim();
  if (!secret || !isPushConfigured()) {
    return NextResponse.json({ error: "no disponible" }, { status: 404 });
  }

  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!provided || !timingSafeEqual(provided, secret)) {
    // 404, not 401: a scheduler endpoint that confirms it exists is an
    // invitation, and the legitimate caller always has the secret.
    return NextResponse.json({ error: "no disponible" }, { status: 404 });
  }

  const database = dbOrNull();
  if (!database) {
    return NextResponse.json({ error: "no disponible" }, { status: 404 });
  }

  const now = Date.now();
  const result = await dispatchDueReminders(database, now);
  await pruneSentReminders(database, now - PRUNE_AFTER_MS);

  // Counts only — how many were due, sent, expired, failed. Nothing here
  // identifies a device or says what any notification was about.
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
