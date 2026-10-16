import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: () => ({ profile: { toArray: async () => [] }, pregnancy: { toArray: async () => [] } }), notDeleted: (rows: unknown[]) => rows }));
vi.mock("@/lib/sync/client", () => ({ ACCOUNT_HEADER: "x-account", ensureAccountLink: async () => ({ status: "anonymous" }) }));
vi.mock("@/lib/sharing/client", () => ({ fetchSharedViews: async () => [] }));

describe("weekly notification consent", () => {
  afterEach(() => vi.unstubAllGlobals());
  const storage = new Map<string, string>();
  const saved: Record<string, unknown>[] = [];
  const permission = vi.fn(async () => "granted");
  let existing: object | null;
  let saveOk: boolean;
  const subscription = { endpoint: "https://fcm.googleapis.com/test-only", toJSON: () => ({ keys: { p256dh: "fixture", auth: "fixture" } }) };

  beforeEach(() => {
    vi.resetModules();
    storage.clear(); saved.length = 0; permission.mockClear(); existing = null; saveOk = true;
    vi.stubGlobal("window", { PushManager: {}, Notification: {} });
    vi.stubGlobal("Notification", { permission: "default", requestPermission: permission });
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    vi.stubGlobal("navigator", { userAgent: "Chrome", serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription: async () => existing, subscribe: async () => subscription } }) } });
    vi.stubGlobal("fetch", vi.fn(async (_input: unknown, init?: RequestInit) => {
      if (init?.method === "POST") { saved.push(JSON.parse(init.body as string)); return { ok: saveOk }; }
      return { ok: true, json: async () => ({ publicKey: "BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }) };
    }));
  });

  it("prepares without prompting, then asks directly on the user's click and enables only weeks", async () => {
    const client = await import("./client");
    await client.readPushState();
    expect(permission).not.toHaveBeenCalled();
    const enabling = client.enableWeekStartNotice();
    expect(permission).toHaveBeenCalledOnce();
    expect(await enabling).toBe("on");
    expect(saved[0]?.categories).toEqual(["consejos"]);
    expect(saved[0]?.reminders).toEqual([]);
  });

  it("preserves existing choices and does not replace companion appointment times", async () => {
    existing = subscription;
    storage.set("mibebe.push.categories", JSON.stringify(["recordatorios", "mimos"]));
    const client = await import("./client");
    await client.readPushState();
    await client.enableWeekStartNotice();
    expect(saved[0]?.categories).toEqual(["recordatorios", "consejos", "mimos"]);
    expect(saved[0]).not.toHaveProperty("reminders");
  });

  it("retains a pending resync when the server refuses the subscription", async () => {
    saveOk = false;
    const client = await import("./client");
    await client.enableWeekStartNotice();
    expect(client.pushResyncPending()).toBe(true);
  });
});
