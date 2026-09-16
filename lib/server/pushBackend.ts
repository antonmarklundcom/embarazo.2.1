import "server-only";

import { and, eq, isNull, lte, sql } from "drizzle-orm";

import type { Database } from "./db";
import { pushReminders, pushSubscriptions } from "./schema";
import type { PushCategory } from "@/lib/push/categories";

// BUILD-PLAN B5, W5 — the storage half of push.
//
// Same cut as V2's `sharingBackend.ts`: `push.ts` holds the decisions —
// what a subscription upsert may and may not overwrite, what "due" means, when
// an endpoint gets pruned — and this file holds every query against
// `pushSubscriptions` and `pushReminders`. `push.test.ts` runs the real
// `push.ts` over a Map.
//
// **`upsertSubscription`'s one rule stays load-bearing here, not merely
// documented.** An anonymous POST to `/api/v1/push` is normal — a device that
// has not signed in must still be able to subscribe (B5) — and the
// consequence, found the hard way, is that a plain overwrite on a duplicate
// endpoint let ANY anonymous replay of a known endpoint null out that row's
// `userId`, detaching it from account deletion forever. The fix is
// `coalesce`: an incoming NULL never overwrites a stored owner. It has to live
// in the write itself (`ON DUPLICATE KEY UPDATE`, not read-then-write),
// because two requests racing on the same endpoint must not both read the old
// owner and then have the anonymous one win.

export interface DueReminder {
  id: string;
  endpoint: string;
  category: PushCategory;
  categories: PushCategory[] | null;
}

export interface PushBackend {
  /**
   * Create or update a subscription, keyed by endpoint. On an existing row,
   * `userId` is coalesced — an incoming `null` never overwrites a stored,
   * non-null owner — and every other field is a plain overwrite.
   */
  upsertSubscription(input: {
    endpoint: string;
    p256dh: string;
    auth: string;
    categories: PushCategory[];
    userId: string | null;
  }): Promise<void>;
  /** Every reminder scheduled for this endpoint, sent or not. */
  deleteAllReminders(endpoint: string): Promise<void>;
  deleteSubscriptionRow(endpoint: string): Promise<void>;
  /** This endpoint's not-yet-sent reminders for one category. */
  deletePendingReminders(endpoint: string, category: PushCategory): Promise<void>;
  insertReminders(
    rows: { id: string; endpoint: string; category: PushCategory; fireAt: number }[],
  ): Promise<void>;
  /** Due and unsent, joined with the subscription's current opt-ins. */
  dueReminders(now: number, limit: number): Promise<DueReminder[]>;
  markSent(id: string, sentAt: number): Promise<void>;
  pruneSentBefore(before: number): Promise<void>;
  /** Every endpoint this account currently has subscribed. */
  subscriptionEndpointsOf(userId: string): Promise<string[]>;
}

/** The real thing. Constructed once per request. */
export function drizzlePushBackend(database: Database): PushBackend {
  return {
    async upsertSubscription(input) {
      await database
        .insert(pushSubscriptions)
        .values({
          id: crypto.randomUUID(),
          userId: input.userId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          categories: input.categories,
          lastSeenAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            // K14 — `coalesce`, not an overwrite. See the file comment above
            // for the bug this guards against: an anonymous POST replaying a
            // captured endpoint must not detach it from its owner.
            userId: sql`coalesce(values(\`userId\`), \`userId\`)`,
            p256dh: input.p256dh,
            auth: input.auth,
            categories: input.categories,
            lastSeenAt: new Date(),
          },
        });
    },

    async deleteAllReminders(endpoint) {
      await database.delete(pushReminders).where(eq(pushReminders.endpoint, endpoint));
    },

    async deleteSubscriptionRow(endpoint) {
      await database.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    },

    async deletePendingReminders(endpoint, category) {
      await database
        .delete(pushReminders)
        .where(
          and(
            eq(pushReminders.endpoint, endpoint),
            eq(pushReminders.category, category),
            isNull(pushReminders.sentAt),
          ),
        );
    },

    async insertReminders(rows) {
      if (rows.length === 0) return;
      await database.insert(pushReminders).values(rows);
    },

    async dueReminders(now, limit) {
      return database
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
    },

    async markSent(id, sentAt) {
      await database.update(pushReminders).set({ sentAt }).where(eq(pushReminders.id, id));
    },

    async pruneSentBefore(before) {
      await database
        .delete(pushReminders)
        .where(sql`${pushReminders.sentAt} is not null and ${pushReminders.sentAt} < ${before}`);
    },

    async subscriptionEndpointsOf(userId) {
      const rows = await database
        .select({ endpoint: pushSubscriptions.endpoint })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));
      return rows.map((row) => row.endpoint);
    },
  };
}
