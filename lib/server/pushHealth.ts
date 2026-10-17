import "server-only";

import { sql } from "drizzle-orm";

import { PUSH_CATEGORIES, type PushCategory } from "@/lib/push/categories";
import type { Database } from "./db";
import { pushReminders, pushSubscriptions } from "./schema";

// "Is the scheduled-notification dispatcher actually running?" — answered from
// the two push tables, with counts only.
//
// What this file reads: whether a subscription has an account link (never WHICH
// account), its category opt-ins, and per category the fire/sent timestamps of
// reminders. It never selects the endpoint, the keys or a user id, and a
// reminder has no content server-side anyway (see `pushReminders`). Every
// number that leaves this module is a count or a timestamp.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Subscription facts with no identity attached: linked or not, and opt-ins. */
export interface SubscriptionFact {
  linked: boolean;
  categories: readonly PushCategory[];
}

/** Reminder counts for one category, already aggregated by the store. */
export interface ReminderCounts {
  category: PushCategory;
  /** fireAt <= now and sentAt is null. */
  dueUnsent: number;
  /** Of those, fireAt more than 1 h ago. */
  dueUnsentOverHour: number;
  sentLast24h: number;
  sentLast7d: number;
  /** Epoch ms of the most recent sentAt, or null when never sent. */
  lastSentAt: number | null;
}

export interface PushHealthStore {
  subscriptionFacts(): Promise<SubscriptionFact[]>;
  reminderCounts(nowMs: number): Promise<ReminderCounts[]>;
}

export interface PushHealth {
  subscriptions: {
    total: number;
    linked: number;
    anonymous: number;
    perCategory: Record<PushCategory, number>;
  };
  reminders: {
    dueUnsent: number;
    dueUnsentOverHour: number;
    sentLast24h: number;
    sentLast7d: number;
    lastSentAt: number | null;
    perCategory: ReminderCounts[];
  };
  /** True when due reminders older than an hour are still unsent. */
  overdue: boolean;
}

function emptyCounts(category: PushCategory): ReminderCounts {
  return {
    category,
    dueUnsent: 0,
    dueUnsentOverHour: 0,
    sentLast24h: 0,
    sentLast7d: 0,
    lastSentAt: null,
  };
}

/** Pure: roll the store's rows up into the panel's numbers. */
export function summarisePushHealth(
  subscriptions: readonly SubscriptionFact[],
  reminders: readonly ReminderCounts[],
): PushHealth {
  const perSubscriptionCategory = Object.fromEntries(
    PUSH_CATEGORIES.map((category) => [category, 0]),
  ) as Record<PushCategory, number>;
  let linked = 0;
  for (const subscription of subscriptions) {
    if (subscription.linked) linked += 1;
    // A category counts once per subscription even if listed twice.
    for (const category of new Set(subscription.categories)) {
      if (category in perSubscriptionCategory) perSubscriptionCategory[category] += 1;
    }
  }

  // Always one row per known category, in the canonical order, so a quiet
  // category shows a zero instead of silently disappearing.
  const byCategory = new Map<PushCategory, ReminderCounts>(
    PUSH_CATEGORIES.map((category) => [category, emptyCounts(category)]),
  );
  for (const row of reminders) {
    const current = byCategory.get(row.category);
    if (!current) continue;
    current.dueUnsent += row.dueUnsent;
    current.dueUnsentOverHour += row.dueUnsentOverHour;
    current.sentLast24h += row.sentLast24h;
    current.sentLast7d += row.sentLast7d;
    if (
      row.lastSentAt !== null &&
      (current.lastSentAt === null || row.lastSentAt > current.lastSentAt)
    ) {
      current.lastSentAt = row.lastSentAt;
    }
  }
  const perCategory = [...byCategory.values()];

  let lastSentAt: number | null = null;
  for (const row of perCategory) {
    if (row.lastSentAt !== null && (lastSentAt === null || row.lastSentAt > lastSentAt)) {
      lastSentAt = row.lastSentAt;
    }
  }
  const sum = (pick: (row: ReminderCounts) => number) =>
    perCategory.reduce((total, row) => total + pick(row), 0);
  const dueUnsentOverHour = sum((row) => row.dueUnsentOverHour);

  return {
    subscriptions: {
      total: subscriptions.length,
      linked,
      anonymous: subscriptions.length - linked,
      perCategory: perSubscriptionCategory,
    },
    reminders: {
      dueUnsent: sum((row) => row.dueUnsent),
      dueUnsentOverHour,
      sentLast24h: sum((row) => row.sentLast24h),
      sentLast7d: sum((row) => row.sentLast7d),
      lastSentAt,
      perCategory,
    },
    overdue: dueUnsentOverHour > 0,
  };
}

export async function pushHealth(
  store: PushHealthStore,
  now: Date = new Date(),
): Promise<PushHealth> {
  const [subscriptions, reminders] = await Promise.all([
    store.subscriptionFacts(),
    store.reminderCounts(now.getTime()),
  ]);
  return summarisePushHealth(subscriptions, reminders);
}

export function drizzlePushHealthStore(database: Database): PushHealthStore {
  return {
    async subscriptionFacts() {
      // Only the presence of an account link and the opt-in list are selected.
      const rows = await database
        .select({
          linked: sql<number>`(${pushSubscriptions.userId} is not null)`,
          categories: pushSubscriptions.categories,
        })
        .from(pushSubscriptions);
      return rows.map((row) => ({
        linked: Number(row.linked) === 1,
        categories: Array.isArray(row.categories) ? row.categories : [],
      }));
    },

    async reminderCounts(nowMs) {
      const hourAgo = nowMs - HOUR_MS;
      const dayAgo = nowMs - DAY_MS;
      const weekAgo = nowMs - 7 * DAY_MS;
      const rows = await database
        .select({
          category: pushReminders.category,
          dueUnsent: sql<number>`sum(case when ${pushReminders.sentAt} is null and ${pushReminders.fireAt} <= ${nowMs} then 1 else 0 end)`,
          dueUnsentOverHour: sql<number>`sum(case when ${pushReminders.sentAt} is null and ${pushReminders.fireAt} <= ${hourAgo} then 1 else 0 end)`,
          sentLast24h: sql<number>`sum(case when ${pushReminders.sentAt} >= ${dayAgo} then 1 else 0 end)`,
          sentLast7d: sql<number>`sum(case when ${pushReminders.sentAt} >= ${weekAgo} then 1 else 0 end)`,
          lastSentAt: sql<number | null>`max(${pushReminders.sentAt})`,
        })
        .from(pushReminders)
        .groupBy(pushReminders.category);

      return rows.map((row) => ({
        category: row.category,
        dueUnsent: Number(row.dueUnsent ?? 0),
        dueUnsentOverHour: Number(row.dueUnsentOverHour ?? 0),
        sentLast24h: Number(row.sentLast24h ?? 0),
        sentLast7d: Number(row.sentLast7d ?? 0),
        lastSentAt: row.lastSentAt === null ? null : Number(row.lastSentAt),
      }));
    },
  };
}
