import "server-only";

import type { PushBackend } from "./pushBackend";
import {
  acceptsCategory,
  normaliseCategories,
  type PushCategory,
} from "@/lib/push/categories";
import { vapidFromEnv, vapidHeaders, type VapidKeys } from "@/lib/push/vapid";

// BUILD-PLAN B5 — the server half of push.
//
// What the server knows, in full: an endpoint, its category opt-ins, and a
// list of "poke this endpoint at this time, about this kind of thing". It does
// not know what any notification says, which appointment a reminder is for, or
// what week anyone is in — the service worker composes the sentence locally
// when the poke arrives (see app/sw.ts). That is what makes server-scheduled
// reminders possible without reading `syncRecords.payload` (§4.3).
//
// Push is optional infrastructure: with VAPID_* unset the routes 404 and the
// app is unchanged, exactly like DATABASE_URL and AUTH_SECRET.
//
// W5: every function that touches storage below takes a `PushBackend`
// (`lib/server/pushBackend.ts`) rather than a `Database`, the same cut V2 gave
// `sharing.ts`. `push.test.ts` runs these functions, unchanged, over a Map.

export function isPushConfigured(): boolean {
  return vapidFromEnv(process.env) !== null;
}

/** The key the browser needs to subscribe. Public by definition. */
export function publicVapidKey(): string | null {
  return vapidFromEnv(process.env)?.publicKey ?? null;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export interface SubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  categories: string[];
  /** Null for a device with no account — push does not require one. */
  userId: string | null;
}

/**
 * Create or update a subscription, keyed by endpoint.
 *
 * Keyed by endpoint rather than by user because that is what a push
 * subscription *is*: one browser on one device. The same person on two phones
 * has two, and one phone shared by two accounts has one.
 *
 * The rule that must survive an anonymous replay — an incoming `null` userId
 * must never un-own an existing subscription — lives in `backend.
 * upsertSubscription`'s contract (`pushBackend.ts`), the same place A3 puts
 * last-write-wins: it is a write-time guarantee, not something this function
 * could enforce by reading first.
 */
export async function saveSubscription(
  backend: PushBackend,
  input: SubscriptionInput,
): Promise<void> {
  const categories = normaliseCategories(input.categories);
  await backend.upsertSubscription({ ...input, categories });
}

/**
 * Remove a subscription and everything scheduled for it.
 *
 * Deleting the reminders too is the point: leaving them would keep poking an
 * endpoint whose owner has just told us to stop, and for an anonymous
 * subscription there is no account whose deletion would ever clean them up.
 */
export async function deleteSubscription(
  backend: PushBackend,
  endpoint: string,
): Promise<void> {
  await backend.deleteAllReminders(endpoint);
  await backend.deleteSubscriptionRow(endpoint);
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

/**
 * Replace this endpoint's pending reminders for a category.
 *
 * Replace, not append: the device re-sends its whole schedule whenever the
 * underlying data changes, so a control that moved does not leave yesterday's
 * poke behind. Already-sent rows are left alone as a record that we sent them.
 */
export async function scheduleReminders(
  backend: PushBackend,
  endpoint: string,
  category: PushCategory,
  fireAtList: number[],
): Promise<void> {
  await backend.deletePendingReminders(endpoint, category);

  if (fireAtList.length === 0) return;

  await backend.insertReminders(
    fireAtList.map((fireAt) => ({
      id: crypto.randomUUID(),
      endpoint,
      category,
      fireAt,
    })),
  );
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export interface DispatchResult {
  due: number;
  sent: number;
  /** Endpoints the push service reported as gone; they were deleted. */
  expired: number;
  failed: number;
}

/**
 * Send every reminder that is due.
 *
 * Called by a scheduled request to `/api/v1/push/dispatch`. Each poke carries
 * no body — the service worker decides what to say.
 */
export async function dispatchDueReminders(
  backend: PushBackend,
  now: number,
  send: PushSender = fetchSender,
  limit = 200,
): Promise<DispatchResult> {
  const keys = vapidFromEnv(process.env);
  if (!keys) return { due: 0, sent: 0, expired: 0, failed: 0 };

  const due = await backend.dueReminders(now, limit);

  let sent = 0;
  let expired = 0;
  let failed = 0;

  for (const row of due) {
    // The opt-in is enforced HERE, at send time, not only in the settings UI.
    // A toggle that merely hides a notification the phone already received is
    // not an opt-out.
    if (!acceptsCategory(row.categories ?? [], row.category)) {
      await backend.markSent(row.id, now);
      continue;
    }

    const outcome = await send(row.endpoint, keys, now);

    if (outcome === "gone") {
      // 404/410 means the browser threw the subscription away. Keeping it
      // would mean retrying forever against an endpoint that cannot exist.
      await deleteSubscription(backend, row.endpoint);
      expired += 1;
      continue;
    }

    if (outcome === "sent") {
      await backend.markSent(row.id, now);
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return { due: due.length, sent, expired, failed };
}

export type SendOutcome = "sent" | "gone" | "failed";
export type PushSender = (
  endpoint: string,
  keys: VapidKeys,
  now: number,
) => Promise<SendOutcome>;

/** The real sender. Swapped for a fake in tests. */
export const fetchSender: PushSender = async (endpoint, keys, now) => {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: vapidHeaders(endpoint, keys, {}, now),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
};

/** Housekeeping: forget reminders that were sent long ago. */
export async function pruneSentReminders(
  backend: PushBackend,
  before: number,
): Promise<void> {
  await backend.pruneSentBefore(before);
}

// ---------------------------------------------------------------------------
// PR-5b — the one poke the device cannot schedule
// ---------------------------------------------------------------------------

/**
 * Poke the owner's devices because a cheer just arrived.
 *
 * Every other reminder in this table is scheduled by the device that wants it,
 * which is what keeps §4.3 intact: the server is told a time and never a
 * reason. A cheer is the exception in one direction only — the *time* is
 * something only the server can know, because it is the moment somebody else
 * pressed a button on their own phone. It still learns nothing new by
 * scheduling it: it wrote the `companionCheers` row a line earlier.
 *
 * The poke carries no body, exactly like the others. The service worker
 * notices the unseen cheer for itself (`app/sw.ts`) and writes the sentence.
 * That is not ceremony — a payload would mean this table starts carrying text,
 * and the next feature would put a name in it.
 *
 * `fireAt: now` rather than an immediate send, so a cheer rides the same
 * dispatcher, retry and opt-in path as everything else. The cost is the
 * dispatch interval; the benefit is that `acceptsCategory` is enforced in
 * exactly one place for every notification the product sends.
 *
 * Appends rather than replaces: `scheduleReminders` is a wholesale replace per
 * category, and two cheers arriving a minute apart are two events. Best-effort
 * by design — a failure here must never fail the cheer itself, which is
 * already stored and already visible in her app.
 */
export async function scheduleCheerPoke(
  backend: PushBackend,
  ownerUserId: string,
  now: number,
): Promise<void> {
  try {
    const endpoints = await backend.subscriptionEndpointsOf(ownerUserId);
    if (endpoints.length === 0) return;

    await backend.insertReminders(
      endpoints.map((endpoint) => ({
        id: crypto.randomUUID(),
        endpoint,
        category: "mimos" as const,
        fireAt: now,
      })),
    );
  } catch {
    // The cheer is already saved and already in her app. A push that failed to
    // enqueue is a missed notification, not a lost message.
  }
}
