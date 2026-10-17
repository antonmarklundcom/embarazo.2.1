import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  pushHealth,
  summarisePushHealth,
  type PushHealthStore,
  type ReminderCounts,
  type SubscriptionFact,
} from "./pushHealth";

// The arithmetic over the two push tables, with no database: the same cut as
// `aiSpend.test.ts`.

const NOW = new Date("2026-10-16T12:00:00Z");

const subs: SubscriptionFact[] = [
  { linked: true, categories: ["recordatorios", "avisos"] },
  { linked: false, categories: ["recordatorios"] },
  { linked: false, categories: [] },
];

const reminders: ReminderCounts[] = [
  {
    category: "recordatorios",
    dueUnsent: 3,
    dueUnsentOverHour: 1,
    sentLast24h: 4,
    sentLast7d: 9,
    lastSentAt: 1_000,
  },
  {
    category: "avisos",
    dueUnsent: 1,
    dueUnsentOverHour: 0,
    sentLast24h: 1,
    sentLast7d: 2,
    lastSentAt: 5_000,
  },
];

describe("summarisePushHealth", () => {
  it("splits subscriptions into linked and anonymous and counts opt-ins", () => {
    const { subscriptions } = summarisePushHealth(subs, []);
    expect(subscriptions.total).toBe(3);
    expect(subscriptions.linked).toBe(1);
    expect(subscriptions.anonymous).toBe(2);
    expect(subscriptions.perCategory).toEqual({
      consejos: 0,
      recordatorios: 2,
      avisos: 1,
      mimos: 0,
    });
  });

  it("counts a duplicated category once per subscription", () => {
    const { subscriptions } = summarisePushHealth(
      [{ linked: false, categories: ["mimos", "mimos"] }],
      [],
    );
    expect(subscriptions.perCategory.mimos).toBe(1);
  });

  it("totals reminders and picks the latest successful dispatch", () => {
    const { reminders: r, overdue } = summarisePushHealth(subs, reminders);
    expect(r.dueUnsent).toBe(4);
    expect(r.dueUnsentOverHour).toBe(1);
    expect(r.sentLast24h).toBe(5);
    expect(r.sentLast7d).toBe(11);
    expect(r.lastSentAt).toBe(5_000);
    expect(overdue).toBe(true);
  });

  it("always lists every category, with zeros when quiet", () => {
    const { reminders: r } = summarisePushHealth([], [reminders[0]!]);
    expect(r.perCategory.map((row) => row.category)).toEqual([
      "consejos",
      "recordatorios",
      "avisos",
      "mimos",
    ]);
    expect(r.perCategory[0]).toMatchObject({ dueUnsent: 0, lastSentAt: null });
  });

  it("is healthy and has no last dispatch when the tables are empty", () => {
    const health = summarisePushHealth([], []);
    expect(health.subscriptions.total).toBe(0);
    expect(health.reminders.lastSentAt).toBeNull();
    expect(health.overdue).toBe(false);
  });

  it("is not overdue when due reminders are all recent", () => {
    const health = summarisePushHealth(
      [],
      [{ ...reminders[0]!, dueUnsent: 5, dueUnsentOverHour: 0 }],
    );
    expect(health.overdue).toBe(false);
  });
});

describe("pushHealth", () => {
  it("passes the current time to the store as epoch ms", async () => {
    let seen: number | null = null;
    const store: PushHealthStore = {
      subscriptionFacts: async () => subs,
      reminderCounts: async (nowMs) => {
        seen = nowMs;
        return reminders;
      },
    };
    const health = await pushHealth(store, NOW);
    expect(seen).toBe(NOW.getTime());
    expect(health.subscriptions.total).toBe(3);
  });
});

describe("what the module may read", () => {
  const source = readFileSync(
    join(process.cwd(), "lib", "server", "pushHealth.ts"),
    "utf8",
  )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("never selects endpoints, keys or user ids", () => {
    expect(source).not.toMatch(/pushSubscriptions\.(endpoint|p256dh|auth)\b/);
    expect(source).not.toMatch(/pushReminders\.endpoint\b/);
    // The only mention of userId is the is-not-null presence test.
    const mentions = source.match(/\.userId\b[^\n]*/g) ?? [];
    for (const line of mentions) expect(line).toContain("is not null");
  });
});
