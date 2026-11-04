import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { lmpFromDueDate } from "@/lib/pregnancy";
import { weekStartTimes, weeklyTipTimes } from "./weekly";
import { lapseNudgeTime, LAST_OPEN_KEY } from "./lapse";
import { ONBOARDING_CATEGORIES } from "./categories";

// Companion "Tu semana nueva" keyed to the OWNER's turnover day, the onboarding
// pre-selection, and the 14-day clock reset on app start.

const fixture = vi.hoisted(() => ({
  pregnancies: [] as Record<string, unknown>[],
  views: [] as unknown[],
  viewsFetched: 0,
}));

vi.mock("@/lib/db", () => ({
  db: () => ({
    profile: { toArray: async () => [] },
    pregnancy: { toArray: async () => fixture.pregnancies },
  }),
  notDeleted: (rows: unknown[]) => rows,
}));
vi.mock("@/lib/sync/client", () => ({ ACCOUNT_HEADER: "x-account", ensureAccountLink: async () => ({ status: "anonymous" }) }));
vi.mock("@/lib/sharing/client", () => ({
  fetchSharedViews: async () => { fixture.viewsFetched += 1; return fixture.views; },
}));

const NOW = new Date(2026, 10, 4, 12, 0).getTime();
// Owner due 2027-03-10 (a Wednesday) → LMP 2026-06-03, also a Wednesday.
const DUE = new Date(2027, 2, 10).getTime();

describe("push client: weekly schedule and onboarding", () => {
  const storage = new Map<string, string>();
  const saved: Record<string, unknown>[] = [];
  const permission = vi.fn(async () => "granted");
  let existing: object | null;
  const subscription = { endpoint: "https://fcm.googleapis.com/test-only", toJSON: () => ({ keys: { p256dh: "fixture", auth: "fixture" } }) };

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ["Date"], now: NOW });
    storage.clear(); saved.length = 0; permission.mockClear(); existing = subscription;
    fixture.pregnancies = []; fixture.views = []; fixture.viewsFetched = 0;
    vi.stubGlobal("window", { PushManager: {}, Notification: {} });
    vi.stubGlobal("Notification", { permission: "granted", requestPermission: permission });
    vi.stubGlobal("caches", { open: async () => ({ delete: async () => true, put: async () => undefined, match: async () => undefined }) });
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    vi.stubGlobal("navigator", { userAgent: "Chrome", serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription: async () => existing, subscribe: async () => subscription } }) } });
    vi.stubGlobal("fetch", vi.fn(async (_input: unknown, init?: RequestInit) => {
      if (init?.method === "POST") { saved.push(JSON.parse(init.body as string)); return { ok: true }; }
      return { ok: true, json: async () => ({ publicKey: "BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }) };
    }));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("keys a companion's weekly pokes to the owner's turnover day, from the due date it was handed", async () => {
    const client = await import("./client");
    await client.setCategories(["consejos"], null, DUE);
    const expected = weekStartTimes(lmpFromDueDate(DUE), NOW);
    expect(expected.length).toBeGreaterThan(0);
    expect(saved[0]?.consejos).toEqual(expected);
    // Every poke on the owner's weekday (Wednesday), at 10:00.
    for (const at of expected) {
      expect(new Date(at).getDay()).toBe(3);
      expect(new Date(at).getHours()).toBe(10);
    }
    // The server learns epoch times only: no week, no due date.
    expect(Object.keys(saved[0]!).sort()).toEqual(["categories", "consejos", "endpoint", "keys", "reminders"]);
    expect(JSON.stringify(saved[0])).not.toContain(String(DUE));
    // Handed in, so no extra fetch.
    expect(fixture.viewsFetched).toBe(0);
  });

  it("looks the owner's due date up live on app start when nobody handed it in", async () => {
    storage.set("mibebe.push.categories", JSON.stringify(["consejos"]));
    fixture.views = [{ role: "partner", snapshot: { week: 23, dueDate: DUE, nextAppointmentAt: null, babyName: null, updatedAt: NOW } }];
    const client = await import("./client");
    await client.refreshWeeklyTips();
    expect(saved[0]?.consejos).toEqual(weekStartTimes(lmpFromDueDate(DUE), NOW));
    expect(saved[0]).not.toHaveProperty("reminders");
  });

  it("keeps the plain weekly slot in planning mode without a companion snapshot", async () => {
    const client = await import("./client");
    await client.setCategories(["consejos"], null, null);
    expect(saved[0]?.consejos).toEqual(weeklyTipTimes(NOW));
  });

  it("uses her own FUM, and fetches no shared views, when the pregnancy is hers", async () => {
    const lmp = new Date(2026, 6, 6).getTime();
    fixture.pregnancies = [{ lmpDate: lmp }];
    const client = await import("./client");
    await client.setCategories(["consejos"], null, DUE);
    await client.refreshWeeklyTips();
    expect(saved[0]?.consejos).toEqual(weekStartTimes(lmp, NOW));
    expect(saved[1]?.consejos).toEqual(weekStartTimes(lmp, NOW));
    expect(fixture.viewsFetched).toBe(0);
  });

  it("records the app open on start, resetting the 14-day clock, even with push off", async () => {
    existing = null;
    storage.set(LAST_OPEN_KEY, String(NOW - 20 * 24 * 60 * 60 * 1000));
    const client = await import("./client");
    await client.refreshWeeklyTips();
    expect(Number(storage.get(LAST_OPEN_KEY))).toBe(NOW);
    expect(lapseNudgeTime(Number(storage.get(LAST_OPEN_KEY)))).toBe(new Date(2026, 10, 18, 10).getTime());
    // Nothing about it reaches the server (no category for it exists yet).
    expect(saved).toHaveLength(0);
  });

  it("onboarding 'Sí' asks once, on the call, and subscribes with what was left ticked", async () => {
    existing = null;
    const client = await import("./client");
    await client.readPushState();
    expect(permission).not.toHaveBeenCalled();
    const enabling = client.enableOnboardingNotices(ONBOARDING_CATEGORIES);
    expect(permission).toHaveBeenCalledOnce();
    expect(await enabling).toBe("on");
    expect(saved[0]?.categories).toEqual(["recordatorios", "consejos", "mimos"]);
    expect(Array.isArray(saved[0]?.consejos)).toBe(true);
  });

  it("onboarding respects an unticked category", async () => {
    existing = null;
    const client = await import("./client");
    await client.readPushState();
    await client.enableOnboardingNotices(["recordatorios", "consejos"]);
    expect(saved[0]?.categories).toEqual(["recordatorios", "consejos"]);
    expect(storage.get("mibebe.push.categories")).toBe(JSON.stringify(["recordatorios", "consejos"]));
  });
});
