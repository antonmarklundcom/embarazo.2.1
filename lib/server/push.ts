import "server-only";

import { and, eq, isNull, lte, sql } from "drizzle-orm";

import type { Database } from "./db";
import { pushReminders, pushSubscriptions } from "./schema";
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
 */
export async function saveSubscription(
  database: Database,
  input: SubscriptionInput,
): Promise<void> {
  const categories = normaliseCategories(input.categories);

  await database
    .insert(pushSubscriptions)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      categories,
      lastSeenAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        // K14 — `coalesce`, not an overwrite.
        //
        // `/api/v1/push` accepts an anonymous POST by design (B5, above): a
        // device that has not signed in must still be able to subscribe. The
        // consequence was that ANY anonymous POST carrying an existing
        // endpoint set that row's `userId` back to NULL — and a NULL `userId`
        // is a subscription A5's account deletion no longer finds, because
        // there is nothing tying it to an account to delete it by. An
        // unauthenticated replay of a captured endpoint could therefore
        // detach every subscription in the table from its owner, permanently.
        //
        // Signing in later still links the row: `values(userId)` wins whenever
        // the incoming value is non-NULL. Only the null case is refused, which
        // is exactly "an anonymous request may not un-own a subscription".
        // (Unsubscribing is DELETE's job, and it removes the row outright.)
        userId: sql`coalesce(values(\`userId\`), \`userId\`)`,
        p256dh: input.p256dh,
        auth: input.auth,
        categories,
        lastSeenAt: new Date(),
      },
    });
}

/**
 * Remove a subscription and everything scheduled for it.
 *
 * Deleting the reminders too is the point: leaving them would keep poking an
 * endpoint whose owner has just told us to stop, and for an anonymous
 * subscription there is no account whose deletion would ever clean them up.
 */
export async function deleteSubscription(
  database: Database,
  endpoint: string,
): Promise<void> {
  await database
    .delete(pushReminders)
    .where(eq(pushReminders.endpoint, endpoint));
  await database
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
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
  database: Database,
  endpoint: string,
  category: PushCategory,
  fireAtList: number[],
): Promise<void> {
  await database
    .delete(pushReminders)
    .where(
      and(
        eq(pushReminders.endpoint, endpoint),
        eq(pushReminders.category, category),
        isNull(pushReminders.sentAt),
      ),
    );

  if (fireAtList.length === 0) return;

  await database.insert(pushReminders).values(
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
  database: Database,
  now: number,
  send: PushSender = fetchSender,
  limit = 200,
): Promise<DispatchResult> {
  const keys = vapidFromEnv(process.env);
  if (!keys) return { due: 0, sent: 0, expired: 0, failed: 0 };

  const due = await database
    .select({
      id: pushReminders.id,
      endpoint: pushReminders.endpoint,
      category: pushReminders.category,
      categories: pushSubscriptions.categories,
    })
    .from(pushReminders)
    .innerJoin(
      pushSubscriptions,
      eq(pushSubscriptions.endpoint, pushReminders.endpoint),
    )
    .where(and(lte(pushReminders.fireAt, now), isNull(pushReminders.sentAt)))
    .limit(limit);

  let sent = 0;
  let expired = 0;
  let failed = 0;

  for (const row of due) {
    // The opt-in is enforced HERE, at send time, not only in the settings UI.
    // A toggle that merely hides a notification the phone already received is
    // not an opt-out.
    if (!acceptsCategory(row.categories ?? [], row.category)) {
      await markSent(database, row.id, now);
      continue;
    }

    const outcome = await send(row.endpoint, keys, now);

    if (outcome === "gone") {
      // 404/410 means the browser threw the subscription away. Keeping it
      // would mean retrying forever against an endpoint that cannot exist.
      await deleteSubscription(database, row.endpoint);
      expired += 1;
      continue;
    }

    if (outcome === "sent") {
      await markSent(database, row.id, now);
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return { due: due.length, sent, expired, failed };
}

async function markSent(
  database: Database,
  id: string,
  now: number,
): Promise<void> {
  await database
    .update(pushReminders)
    .set({ sentAt: now })
    .where(eq(pushReminders.id, id));
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
    });
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
};

/** Housekeeping: forget reminders that were sent long ago. */
export async function pruneSentReminders(
  database: Database,
  before: number,
): Promise<void> {
  await database
    .delete(pushReminders)
    .where(sql`${pushReminders.sentAt} is not null and ${pushReminders.sentAt} < ${before}`);
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
  database: Database,
  ownerUserId: string,
  now: number,
): Promise<void> {
  try {
    const subscriptions = await database
      .select({ endpoint: pushSubscriptions.endpoint })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, ownerUserId));

    if (subscriptions.length === 0) return;

    await database.insert(pushReminders).values(
      subscriptions.map((row) => ({
        id: crypto.randomUUID(),
        endpoint: row.endpoint,
        category: "mimos" as const,
        fireAt: now,
      })),
    );
  } catch {
    // The cheer is already saved and already in her app. A push that failed to
    // enqueue is a missed notification, not a lost message.
  }
}
