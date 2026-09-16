import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteSubscription,
  dispatchDueReminders,
  pruneSentReminders,
  saveSubscription,
  scheduleCheerPoke,
  scheduleReminders,
  type SendOutcome,
} from "./push";
import type { DueReminder, PushBackend } from "./pushBackend";
import type { PushCategory } from "@/lib/push/categories";

// B5, W5 — what the push server decides, asserted.
//
// These run the real `lib/server/push.ts` — the same functions the routes and
// `scheduleCheerPoke`'s caller (`/api/v1/sharing`) use, unmodified — with a Map
// underneath instead of MySQL, the same cut A3's `sync.test.ts` and V2's
// `sharing.test.ts` use. `lib/push/routeContract.test.ts` still watches the
// SQL and the route's own properties; this file is about the decisions.
//
// `dispatchDueReminders` reads VAPID_* from `process.env` itself (mirroring
// `isPushConfigured`), so the "dispatching" block below sets fixture values
// for its own duration and restores whatever was there. The keys never reach
// real crypto in these tests — `send` is a fake, never `fetchSender` — so the
// fixture only has to satisfy `vapidFromEnv`'s presence check.

function memoryBackend(): PushBackend & {
  subs: Map<string, { id: string; endpoint: string; userId: string | null; categories: PushCategory[] }>;
  reminders: Map<string, { id: string; endpoint: string; category: PushCategory; fireAt: number; sentAt: number | null }>;
} {
  const subs = new Map<
    string,
    { id: string; endpoint: string; userId: string | null; categories: PushCategory[] }
  >();
  const reminders = new Map<
    string,
    { id: string; endpoint: string; category: PushCategory; fireAt: number; sentAt: number | null }
  >();

  return {
    subs,
    reminders,

    async upsertSubscription(input) {
      const existing = subs.get(input.endpoint);
      if (existing) {
        // Mirrors `coalesce(values(userId), userId)`: an incoming null never
        // overwrites a stored, non-null owner.
        existing.userId = input.userId ?? existing.userId;
        existing.categories = input.categories;
        return;
      }
      subs.set(input.endpoint, {
        id: crypto.randomUUID(),
        endpoint: input.endpoint,
        userId: input.userId,
        categories: input.categories,
      });
    },

    async deleteAllReminders(endpoint) {
      for (const [id, row] of reminders) {
        if (row.endpoint === endpoint) reminders.delete(id);
      }
    },

    async deleteSubscriptionRow(endpoint) {
      subs.delete(endpoint);
    },

    async deletePendingReminders(endpoint, category) {
      for (const [id, row] of reminders) {
        if (row.endpoint === endpoint && row.category === category && row.sentAt === null) {
          reminders.delete(id);
        }
      }
    },

    async insertReminders(rows) {
      for (const row of rows) reminders.set(row.id, { ...row, sentAt: null });
    },

    async dueReminders(now, limit): Promise<DueReminder[]> {
      // Mirrors the INNER JOIN: a reminder for an endpoint with no live
      // subscription does not come back.
      return [...reminders.values()]
        .filter((row) => row.sentAt === null && row.fireAt <= now && subs.has(row.endpoint))
        .slice(0, limit)
        .map((row) => ({
          id: row.id,
          endpoint: row.endpoint,
          category: row.category,
          categories: subs.get(row.endpoint)!.categories,
        }));
    },

    async markSent(id, sentAt) {
      const row = reminders.get(id);
      if (row) row.sentAt = sentAt;
    },

    async pruneSentBefore(before) {
      for (const [id, row] of reminders) {
        if (row.sentAt !== null && row.sentAt < before) reminders.delete(id);
      }
    },

    async subscriptionEndpointsOf(userId) {
      return [...subs.values()].filter((row) => row.userId === userId).map((row) => row.endpoint);
    },
  };
}

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc";
const NOW = 1_760_000_000_000;

describe("subscribing", () => {
  it("stores a new subscription with its owner", async () => {
    const backend = memoryBackend();

    await saveSubscription(backend, {
      endpoint: ENDPOINT,
      p256dh: "p",
      auth: "a",
      categories: ["recordatorios"],
      userId: "user-1",
    });

    expect(backend.subs.get(ENDPOINT)).toMatchObject({ userId: "user-1" });
  });

  it("does not un-own a subscription on an anonymous replay", async () => {
    // The bug this whole cut exists to keep fixed: an unauthenticated POST
    // carrying a known endpoint must not detach it from account deletion.
    const backend = memoryBackend();
    await saveSubscription(backend, {
      endpoint: ENDPOINT,
      p256dh: "p",
      auth: "a",
      categories: ["recordatorios"],
      userId: "user-1",
    });

    await saveSubscription(backend, {
      endpoint: ENDPOINT,
      p256dh: "p2",
      auth: "a2",
      categories: ["recordatorios"],
      userId: null,
    });

    expect(backend.subs.get(ENDPOINT)?.userId).toBe("user-1");
  });

  it("still links the subscription once a session appears", async () => {
    const backend = memoryBackend();
    await saveSubscription(backend, {
      endpoint: ENDPOINT,
      p256dh: "p",
      auth: "a",
      categories: [],
      userId: null,
    });

    await saveSubscription(backend, {
      endpoint: ENDPOINT,
      p256dh: "p",
      auth: "a",
      categories: [],
      userId: "user-1",
    });

    expect(backend.subs.get(ENDPOINT)?.userId).toBe("user-1");
  });

  it("drops an unrecognised category rather than storing it", async () => {
    const backend = memoryBackend();

    await saveSubscription(backend, {
      endpoint: ENDPOINT,
      p256dh: "p",
      auth: "a",
      categories: ["recordatorios", "made-up"],
      userId: null,
    });

    expect(backend.subs.get(ENDPOINT)?.categories).toEqual(["recordatorios"]);
  });
});

describe("unsubscribing", () => {
  it("removes the subscription and every reminder scheduled for it", async () => {
    const backend = memoryBackend();
    await saveSubscription(backend, { endpoint: ENDPOINT, p256dh: "p", auth: "a", categories: [], userId: null });
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW + 1000]);

    await deleteSubscription(backend, ENDPOINT);

    expect(backend.subs.has(ENDPOINT)).toBe(false);
    expect([...backend.reminders.values()].some((r) => r.endpoint === ENDPOINT)).toBe(false);
  });

  it("does not error when the endpoint was never subscribed", async () => {
    const backend = memoryBackend();
    await expect(deleteSubscription(backend, "https://no-such-endpoint")).resolves.toBeUndefined();
  });
});

describe("scheduling reminders", () => {
  it("replaces the pending list for one category", async () => {
    const backend = memoryBackend();
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW, NOW + 1000]);

    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW + 2000]);

    const pending = [...backend.reminders.values()].filter((r) => r.category === "recordatorios");
    expect(pending.map((r) => r.fireAt)).toEqual([NOW + 2000]);
  });

  it("leaves another category's schedule alone", async () => {
    // Load-bearing: topping up `consejos` must not cancel a `recordatorios`
    // reminder scheduled from data that call site does not have.
    const backend = memoryBackend();
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW]);

    await scheduleReminders(backend, ENDPOINT, "consejos", [NOW + 1000]);

    const reminderCategories = [...backend.reminders.values()].map((r) => r.category).sort();
    expect(reminderCategories).toEqual(["consejos", "recordatorios"]);
  });

  it("does not touch a reminder that has already been sent", async () => {
    const backend = memoryBackend();
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW]);
    const [sent] = [...backend.reminders.values()];
    sent!.sentAt = NOW;

    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW + 5000]);

    expect(backend.reminders.has(sent!.id)).toBe(true);
  });

  it("clears the schedule when handed an empty list", async () => {
    const backend = memoryBackend();
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW]);

    await scheduleReminders(backend, ENDPOINT, "recordatorios", []);

    expect(backend.reminders.size).toBe(0);
  });
});

describe("dispatching due reminders", () => {
  const ORIGINAL_ENV = {
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  };

  beforeEach(() => {
    // Presence only — `vapidFromEnv` never parses these as real keys, and the
    // fake `send` below never reaches `fetchSender`'s crypto.
    process.env.VAPID_PUBLIC_KEY = "fixture-public-key";
    process.env.VAPID_PRIVATE_KEY = "fixture-private-key";
    process.env.VAPID_SUBJECT = "mailto:hola@mibebe.com.py";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function fakeSender(outcome: SendOutcome) {
    return vi.fn(async () => outcome);
  }

  it("sends a due, opted-in reminder and marks it sent", async () => {
    const backend = memoryBackend();
    await saveSubscription(backend, { endpoint: ENDPOINT, p256dh: "p", auth: "a", categories: ["recordatorios"], userId: null });
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW - 1000]);
    const send = fakeSender("sent");

    const result = await dispatchDueReminders(backend, NOW, send);

    expect(result).toEqual({ due: 1, sent: 1, expired: 0, failed: 0 });
    expect(send).toHaveBeenCalledTimes(1);
    expect([...backend.reminders.values()][0]?.sentAt).toBe(NOW);
  });

  it("does not send a reminder that is not due yet", async () => {
    const backend = memoryBackend();
    await saveSubscription(backend, { endpoint: ENDPOINT, p256dh: "p", auth: "a", categories: ["recordatorios"], userId: null });
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW + 60_000]);
    const send = fakeSender("sent");

    const result = await dispatchDueReminders(backend, NOW, send);

    expect(result).toEqual({ due: 0, sent: 0, expired: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("marks a category the device opted out of as handled, without sending", async () => {
    // Enforced at send time, not only in the settings UI: the toggle must
    // still work even for a poke that was already scheduled.
    const backend = memoryBackend();
    await saveSubscription(backend, { endpoint: ENDPOINT, p256dh: "p", auth: "a", categories: [], userId: null });
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW - 1000]);
    const send = fakeSender("sent");

    const result = await dispatchDueReminders(backend, NOW, send);

    expect(send).not.toHaveBeenCalled();
    expect(result).toEqual({ due: 1, sent: 0, expired: 0, failed: 0 });
    expect([...backend.reminders.values()][0]?.sentAt).toBe(NOW);
  });

  it("deletes the subscription when the push service reports it gone", async () => {
    const backend = memoryBackend();
    await saveSubscription(backend, { endpoint: ENDPOINT, p256dh: "p", auth: "a", categories: ["recordatorios"], userId: null });
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW - 1000]);
    const send = fakeSender("gone");

    const result = await dispatchDueReminders(backend, NOW, send);

    expect(result).toEqual({ due: 1, sent: 0, expired: 1, failed: 0 });
    expect(backend.subs.has(ENDPOINT)).toBe(false);
  });

  it("leaves a failed send unmarked, so it is retried", async () => {
    const backend = memoryBackend();
    await saveSubscription(backend, { endpoint: ENDPOINT, p256dh: "p", auth: "a", categories: ["recordatorios"], userId: null });
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW - 1000]);
    const send = fakeSender("failed");

    const result = await dispatchDueReminders(backend, NOW, send);

    expect(result).toEqual({ due: 1, sent: 0, expired: 0, failed: 1 });
    expect([...backend.reminders.values()][0]?.sentAt).toBeNull();
  });

  it("does not reach a push service when push is not configured", async () => {
    const backend = memoryBackend();
    await saveSubscription(backend, { endpoint: ENDPOINT, p256dh: "p", auth: "a", categories: ["recordatorios"], userId: null });
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW - 1000]);
    const send = fakeSender("sent");

    // Overrides this block's own `beforeEach` fixture for one test, exactly
    // like the deployments this checks: dispatch never reaches a push service
    // for a due reminder whose keys are absent.
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    const result = await dispatchDueReminders(backend, NOW, send);

    expect(result).toEqual({ due: 0, sent: 0, expired: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("housekeeping", () => {
  it("forgets a reminder sent long ago", async () => {
    const backend = memoryBackend();
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW]);
    const [row] = [...backend.reminders.values()];
    row!.sentAt = NOW - 1000;

    await pruneSentReminders(backend, NOW);

    expect(backend.reminders.size).toBe(0);
  });

  it("keeps a reminder that has not been sent yet", async () => {
    const backend = memoryBackend();
    await scheduleReminders(backend, ENDPOINT, "recordatorios", [NOW]);

    await pruneSentReminders(backend, NOW + 10_000);

    expect(backend.reminders.size).toBe(1);
  });
});

describe("the cheer poke", () => {
  it("schedules an immediate poke to every one of the owner's endpoints", async () => {
    const backend = memoryBackend();
    await saveSubscription(backend, { endpoint: "https://a", p256dh: "p", auth: "a", categories: [], userId: "owner-1" });
    await saveSubscription(backend, { endpoint: "https://b", p256dh: "p", auth: "a", categories: [], userId: "owner-1" });
    await saveSubscription(backend, { endpoint: "https://c", p256dh: "p", auth: "a", categories: [], userId: "somebody-else" });

    await scheduleCheerPoke(backend, "owner-1", NOW);

    const endpoints = [...backend.reminders.values()].map((r) => r.endpoint).sort();
    expect(endpoints).toEqual(["https://a", "https://b"]);
    expect([...backend.reminders.values()].every((r) => r.category === "mimos" && r.fireAt === NOW)).toBe(true);
  });

  it("does nothing for an owner with no subscribed device", async () => {
    const backend = memoryBackend();

    await scheduleCheerPoke(backend, "owner-1", NOW);

    expect(backend.reminders.size).toBe(0);
  });

  it("never records what the cheer was about", async () => {
    const backend = memoryBackend();
    await saveSubscription(backend, { endpoint: "https://a", p256dh: "p", auth: "a", categories: [], userId: "owner-1" });

    await scheduleCheerPoke(backend, "owner-1", NOW);

    const [row] = [...backend.reminders.values()];
    expect(Object.keys(row!).sort()).toEqual(["category", "endpoint", "fireAt", "id", "sentAt"]);
  });

  it("swallows a backend failure rather than losing the cheer", async () => {
    const backend = memoryBackend();
    backend.subscriptionEndpointsOf = async () => {
      throw new Error("connection lost");
    };

    await expect(scheduleCheerPoke(backend, "owner-1", NOW)).resolves.toBeUndefined();
  });
});
