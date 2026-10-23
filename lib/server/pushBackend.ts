import "server-only";

import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";

import type { Database } from "./db";
import { pushReminders, pushSubscriptions } from "./schema";
import type { PushCategory } from "@/lib/push/categories";
import { AccountWriteDenied } from "./accountWrite";

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
  /** When it was due — N5's give-up rule needs it. */
  fireAt: number;
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
  /** Serialize replacement with other schedules/rotation on the subscription row. */
  replacePendingReminders(endpoint: string, category: PushCategory, fireAt: number[]): Promise<void>;
  insertReminders(
    rows: { id: string; endpoint: string; category: PushCategory; fireAt: number }[],
  ): Promise<void>;
  /** Due and unsent, joined with the subscription's current opt-ins. */
  /** Oldest first (N5: an unordered LIMIT let a backlog starve new rows). */
  dueReminders(now: number, limit: number): Promise<DueReminder[]>;
  markSent(id: string, sentAt: number): Promise<void>;
  /**
   * N5 — take one reminder for this run: a conditional write, so of two
   * overlapping dispatch runs exactly one sends it. False when another run
   * already has it.
   */
  claim(id: string, at: number, expectedEndpoint?: string): Promise<boolean>;
  /** Give a claimed reminder back after a failed send, for a later run. */
  release(id: string): Promise<void>;
  pruneSentBefore(before: number): Promise<void>;
  /** Every endpoint this account currently has subscribed. */
  subscriptionEndpointsOf(userId: string): Promise<string[]>;
  /**
   * The stored owner and opt-ins of one endpoint, or null when it is not
   * subscribed. Used by `rotateSubscription` to carry them to the new endpoint.
   */
  subscriptionOf(
    endpoint: string,
  ): Promise<{ userId: string | null; categories: PushCategory[] } | null>;
  /**
   * Re-point reminders and claimed/sent markers from `from` to `to`, keeping
   * their id, category, time and sentAt. Claimed/sent beats pending on overlap.
   *
   * An equal pending (category, fireAt) is kept only once. The app may have
   * re-posted the destination schedule before rotation; its pending duplicate
   * must not survive a claim on either endpoint. Already-started network sends
   * on both endpoints cannot be cancelled by a database operation.
   */
  moveUnsentReminders(from: string, to: string): Promise<void>;
  /** Atomic rotation, including opt-ins, pending reminders and old-row deletion. */
  rotateSubscription(oldEndpoint: string, next: { endpoint: string; p256dh: string; auth: string }): Promise<"rotated" | "unknown">;
}

// Force rollback of any provisional destination when the old endpoint vanished.
class UnknownRotationEndpoint extends Error {}

/** The real thing. Constructed once per request. */
export function drizzlePushBackend(database: Database, guardedOwners?: readonly string[]): PushBackend {
  return {
    async upsertSubscription(input) {
      await database.transaction(async (tx) => {
      const values = {
        id: crypto.randomUUID(), userId: input.userId, endpoint: input.endpoint,
        p256dh: input.p256dh, auth: input.auth, categories: input.categories,
        lastSeenAt: new Date(),
      };
      // Claim the unique endpoint before any locking read. Two first anonymous
      // requests otherwise share missing-key gap locks and deadlock on INSERT.
      // An existing row is unchanged until the owner guards below pass; a
      // refusal rolls this reservation back with the surrounding transaction.
      await tx.insert(pushSubscriptions).values(values)
        .onDuplicateKeyUpdate({ set: { endpoint: input.endpoint } });
      const [existing] = await tx.select({ userId: pushSubscriptions.userId }).from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, input.endpoint)).for("update");
      if (existing?.userId && guardedOwners && !guardedOwners.includes(existing.userId)) throw new AccountWriteDenied();
      // Account switching signs out/unsubscribes first. A captured endpoint
      // cannot be rebound from one non-null owner to another by a plain POST.
      if (existing?.userId && input.userId && existing.userId !== input.userId) throw new AccountWriteDenied();
      await tx
        .insert(pushSubscriptions)
        .values(values)
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

    async replacePendingReminders(endpoint, category, fireAt) {
      await database.transaction(async (tx) => {
        // This existing, unique endpoint row is the mutex across server
        // processes. A JS queue would only serialize one process's requests.
        const [subscription] = await tx.select({ id: pushSubscriptions.id, userId: pushSubscriptions.userId })
          .from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).for("update");
        if (!subscription) return;
        if (subscription.userId && guardedOwners && !guardedOwners.includes(subscription.userId)) throw new AccountWriteDenied();
        // Lock rows before inspecting sentAt: a dispatch claiming an old row
        // must finish its claim before we decide whether to replace it.
        const existing = await tx.select({ fireAt: pushReminders.fireAt, sentAt: pushReminders.sentAt })
          .from(pushReminders).where(and(eq(pushReminders.endpoint, endpoint), eq(pushReminders.category, category))).for("update");
        const alreadySent = new Set(existing.filter((row) => row.sentAt !== null).map((row) => row.fireAt));
        await tx.delete(pushReminders).where(and(eq(pushReminders.endpoint, endpoint), eq(pushReminders.category, category), isNull(pushReminders.sentAt)));
        const rows = [...new Set(fireAt)].filter((at) => !alreadySent.has(at)).map((at) => ({
          id: crypto.randomUUID(), endpoint, category, fireAt: at,
        }));
        if (rows.length > 0) await tx.insert(pushReminders).values(rows);
      });
    },

    async rotateSubscription(oldEndpoint, next) {
      try {
      return await database.transaction<"rotated" | "unknown">(async (tx) => {
        // Claim/lock endpoints in one order, including an absent destination.
        // Locking its missing-key gap before INSERT lets concurrent anonymous
        // rotations share gap locks and then deadlock trying to create it.
        const locked = new Map<string, { userId: string | null; categories: PushCategory[] }>();
        for (const endpoint of [...new Set([oldEndpoint, next.endpoint])].sort()) {
          if (endpoint !== oldEndpoint) {
            // Existing owner, keys and categories are untouched before guards.
            await tx.insert(pushSubscriptions).values({
              id: crypto.randomUUID(), userId: null, endpoint,
              p256dh: next.p256dh, auth: next.auth, categories: [], lastSeenAt: new Date(),
            }).onDuplicateKeyUpdate({ set: { endpoint } });
          }
          const [row] = await tx.select({ userId: pushSubscriptions.userId, categories: pushSubscriptions.categories })
            .from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).for("update");
          if (!row && endpoint === oldEndpoint) throw new UnknownRotationEndpoint();
          if (row) locked.set(endpoint, row);
        }
        const old = locked.get(oldEndpoint)!;
        const destination = locked.get(next.endpoint);
        for (const owner of [old.userId, destination?.userId]) {
          if (owner && guardedOwners && !guardedOwners.includes(owner)) throw new AccountWriteDenied();
        }
        const backend = drizzlePushBackend(tx as unknown as Database, guardedOwners);
        await backend.upsertSubscription({ ...next, userId: old.userId, categories: old.categories });
        if (next.endpoint === oldEndpoint) return "rotated";
        await backend.moveUnsentReminders(oldEndpoint, next.endpoint);
        await backend.deleteAllReminders(oldEndpoint);
        await backend.deleteSubscriptionRow(oldEndpoint);
        return "rotated";
      });
      } catch (error) {
        // Returning unknown inside the transaction could commit a new anonymous
        // destination despite there being no old subscription to authorize it.
        if (error instanceof UnknownRotationEndpoint) return "unknown";
        throw error;
      }
    },

    async dueReminders(now, limit) {
      return database
        .select({
          id: pushReminders.id,
          endpoint: pushReminders.endpoint,
          category: pushReminders.category,
          categories: pushSubscriptions.categories,
          fireAt: pushReminders.fireAt,
        })
        .from(pushReminders)
        .innerJoin(
          pushSubscriptions,
          eq(pushSubscriptions.endpoint, pushReminders.endpoint),
        )
        .where(and(lte(pushReminders.fireAt, now), isNull(pushReminders.sentAt)))
        .orderBy(asc(pushReminders.fireAt))
        .limit(limit);
    },

    async markSent(id, sentAt) {
      await database.update(pushReminders).set({ sentAt }).where(eq(pushReminders.id, id));
    },

    async claim(id, at, expectedEndpoint) {
      const result = await database
        .update(pushReminders)
        .set({ sentAt: at })
        .where(and(eq(pushReminders.id, id), isNull(pushReminders.sentAt),
          expectedEndpoint === undefined ? undefined : eq(pushReminders.endpoint, expectedEndpoint)));
      const header = Array.isArray(result) ? result[0] : result;
      return ((header as { affectedRows?: number } | undefined)?.affectedRows ?? 0) > 0;
    },

    async release(id) {
      await database.update(pushReminders).set({ sentAt: null }).where(eq(pushReminders.id, id));
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

    async subscriptionOf(endpoint) {
      const [row] = await database
        .select({
          userId: pushSubscriptions.userId,
          categories: pushSubscriptions.categories,
        })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, endpoint))
        .limit(1);
      return row ? { userId: row.userId, categories: row.categories } : null;
    },

    async moveUnsentReminders(from, to) {
      // The historical method name also carries claimed/sent markers. A
      // claim stamps sentAt BEFORE network I/O, so discarding that row during
      // rotation would let a duplicate destination event send a second time.
      const fields = {
        id: pushReminders.id,
        category: pushReminders.category,
        fireAt: pushReminders.fireAt,
        sentAt: pushReminders.sentAt,
      };
      const existing = await database.select(fields).from(pushReminders)
        .where(eq(pushReminders.endpoint, to)).for("update");
      const moving = await database.select(fields).from(pushReminders)
        .where(eq(pushReminders.endpoint, from)).for("update");
      const all = [...existing, ...moving];
      const chosen = new Map<string, (typeof all)[number]>();
      for (const row of all) {
        const key = `${row.category}|${row.fireAt}`;
        const previous = chosen.get(key);
        // Prefer a claimed/sent row over a pending duplicate; otherwise keep
        // the destination's canonical ID. Never manufacture a fresh event.
        if (!previous || (previous.sentAt === null && row.sentAt !== null)) chosen.set(key, row);
      }
      const duplicateIds = all.filter((row) => chosen.get(`${row.category}|${row.fireAt}`)?.id !== row.id).map((row) => row.id);
      if (duplicateIds.length > 0) await database.delete(pushReminders).where(inArray(pushReminders.id, duplicateIds));
      // Preserve the winning claim ID and sentAt. If its in-flight send later
      // fails, release(id) requeues that same marker on the NEW endpoint.
      // Network sends already started on BOTH endpoints cannot be unsent.
      await database.update(pushReminders).set({ endpoint: to })
        .where(eq(pushReminders.endpoint, from));
    },
  };
}
