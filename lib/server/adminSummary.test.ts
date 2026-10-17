import { describe, expect, it } from "vitest";

import { defaultFlags, FLAG_KEYS } from "@/lib/flags/keys";
import { loadAdminSummary } from "./adminSummary";
import type { PushHealthStore, ReminderCounts } from "./pushHealth";

const NOW = new Date("2026-10-17T12:00:00Z");

function storeWith(reminders: ReminderCounts[]): PushHealthStore {
  return {
    subscriptionFacts: async () => [{ linked: true, categories: ["consejos"] }],
    reminderCounts: async () => reminders,
  };
}

const row = (over: Partial<ReminderCounts>): ReminderCounts => ({
  category: "consejos",
  dueUnsent: 0,
  dueUnsentOverHour: 0,
  sentLast24h: 0,
  sentLast7d: 0,
  lastSentAt: null,
  ...over,
});

describe("loadAdminSummary", () => {
  it("reports the revision, overdue counts, the last send and every flag", async () => {
    const summary = await loadAdminSummary({
      revision: "5b8a139",
      pushStore: storeWith([
        row({ category: "consejos", dueUnsent: 3, dueUnsentOverHour: 1, lastSentAt: 1_000 }),
        row({ category: "recordatorios", dueUnsent: 2, lastSentAt: 5_000 }),
      ]),
      readFlags: async () => ({ ...defaultFlags(), recomendados: true }),
      flagsFromDatabase: true,
      now: NOW,
    });

    expect(summary.revision).toBe("5b8a139");
    expect(summary.push).toEqual({ kind: "ok", lastSentAt: 5_000, overdue: 5, overdueOverHour: 1 });
    expect(summary.flags.map((flag) => flag.key)).toEqual(FLAG_KEYS);
    expect(summary.flags.find((flag) => flag.key === "recomendados")).toEqual({
      key: "recomendados",
      on: true,
      changed: true,
    });
    expect(summary.flags.find((flag) => flag.key === "guarani")).toEqual({
      key: "guarani",
      on: false,
      changed: false,
    });
    expect(summary.flagsFromDatabase).toBe(true);
  });

  it("says when nothing was ever sent", async () => {
    const summary = await loadAdminSummary({
      revision: "unknown",
      pushStore: storeWith([]),
      readFlags: async () => defaultFlags(),
      flagsFromDatabase: true,
      now: NOW,
    });
    expect(summary.push).toEqual({ kind: "ok", lastSentAt: null, overdue: 0, overdueOverHour: 0 });
  });

  it("has no push numbers without a database, and still lists the default flags", async () => {
    const summary = await loadAdminSummary({
      revision: "5b8a139",
      pushStore: null,
      readFlags: async () => defaultFlags(),
      flagsFromDatabase: false,
      now: NOW,
    });
    expect(summary.push).toEqual({ kind: "no-database" });
    expect(summary.flagsFromDatabase).toBe(false);
    expect(summary.flags.every((flag) => !flag.changed)).toBe(true);
  });

  it("a push store that throws becomes 'unavailable', not a crash", async () => {
    const summary = await loadAdminSummary({
      revision: "5b8a139",
      pushStore: {
        subscriptionFacts: async () => {
          throw new Error("ER_NO_SUCH_TABLE");
        },
        reminderCounts: async () => [],
      },
      readFlags: async () => defaultFlags(),
      flagsFromDatabase: true,
      now: NOW,
    });
    expect(summary.push).toEqual({ kind: "unavailable" });
  });

  it("carries counts, timestamps and flag names only", async () => {
    const summary = await loadAdminSummary({
      revision: "5b8a139",
      pushStore: storeWith([row({ dueUnsent: 1, lastSentAt: 9 })]),
      readFlags: async () => defaultFlags(),
      flagsFromDatabase: true,
      now: NOW,
    });
    expect(Object.keys(summary).sort()).toEqual(["flags", "flagsFromDatabase", "push", "revision"]);
    expect(Object.keys(summary.push).sort()).toEqual(["kind", "lastSentAt", "overdue", "overdueOverHour"]);
  });
});
