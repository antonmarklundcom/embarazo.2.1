import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: () => ({ profile: { toArray: async () => [] }, pregnancy: { toArray: async () => [] } }), notDeleted: (rows: unknown[]) => rows }));
vi.mock("@/lib/sync/client", () => ({ ACCOUNT_HEADER: "x-account", ensureAccountLink: async () => ({ status: "linked", accountId: "synthetic-owner" }) }));
vi.mock("@/lib/sharing/client", () => ({ fetchSharedViews: async () => [] }));

describe("browser push failures are retryable outcomes", () => {
  const saved = new Map<string, string>();
  const getSubscription = vi.fn();
  const subscribe = vi.fn();
  const permission = vi.fn();
  const notification = { permission: "default", requestPermission: permission };
  const unsubscribe = vi.fn();
  const subscription = { endpoint: "https://fcm.googleapis.com/synthetic-only", unsubscribe, toJSON: () => ({ keys: { p256dh: "synthetic", auth: "synthetic" } }) };
  let policy: Response | undefined;
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); saved.clear();
    saved.set("mibebe.push.categories", JSON.stringify(["consejos"]));
    notification.permission = "default";
    permission.mockResolvedValue("granted");
    getSubscription.mockResolvedValue(null);
    subscribe.mockResolvedValue(subscription);
    unsubscribe.mockResolvedValue(true);
    policy = new Response(JSON.stringify(["recordatorios", "mimos"]));
    vi.stubGlobal("caches", { open: async () => ({
      match: async () => policy?.clone(),
      delete: async () => { policy = undefined; return true; },
      put: async (_key: string, response: Response) => { policy = response; },
    }) });
    vi.stubGlobal("window", { PushManager: {}, Notification: notification });
    vi.stubGlobal("Notification", notification);
    vi.stubGlobal("navigator", { userAgent: "Chrome", serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe } }) } });
    vi.stubGlobal("localStorage", { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) });
    vi.stubGlobal("fetch", vi.fn(async (_input: unknown, init?: RequestInit) => init?.method === "POST" ? { ok: true } : { ok: true, json: async () => ({ publicKey: "BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }) }));
  });
  afterEach(() => vi.unstubAllGlobals());

  for (const step of ["permission", "read", "subscribe"]) {
    it(`preserves choices and allows retry when ${step} rejects`, async () => {
      const client = await import("./client");
      const fail = new DOMException("synthetic failure", step === "permission" ? "NotAllowedError" : "AbortError");
      if (step === "permission") permission.mockRejectedValueOnce(fail);
      if (step === "read") getSubscription.mockRejectedValueOnce(fail);
      if (step === "subscribe") subscribe.mockRejectedValueOnce(fail);
      expect(await client.enablePush(["consejos"])).toBe("error");
      expect(saved.get("mibebe.push.categories")).toBe(JSON.stringify(["consejos"]));
      expect(await client.enablePush(["consejos"])).toBe("on");
    });
  }

  it("maps explicit denial/revocation to denied without subscribing", async () => {
    permission.mockResolvedValue("denied");
    const client = await import("./client");
    expect(await client.enablePush()).toBe("denied");
    expect(subscribe).not.toHaveBeenCalled();
    notification.permission = "denied";
    permission.mockRejectedValueOnce(new DOMException("revoked", "NotAllowedError"));
    expect(await client.enablePush()).toBe("denied");
  });

  it("handles passive subscription-read failure without prompting", async () => {
    getSubscription.mockRejectedValueOnce(new Error("synthetic browser fault"));
    const client = await import("./client");
    expect(await client.readPushState()).toMatchObject({ status: "error", categories: ["consejos"] });
    expect(permission).not.toHaveBeenCalled();
  });

  it("keeps opt-outs locally and marks resync if subscription read fails while saving", async () => {
    getSubscription.mockRejectedValueOnce(new Error("synthetic browser fault"));
    const client = await import("./client");
    await expect(client.setCategories([])).resolves.toBeUndefined();
    expect(saved.get("mibebe.push.categories")).toBe("[]");
    expect(client.pushResyncPending()).toBe(true);
  });

  it("does not throw on a test subscription-read failure or send a real request", async () => {
    getSubscription.mockRejectedValueOnce(new Error("synthetic browser fault"));
    const client = await import("./client");
    expect(await client.sendTestNotification()).toBe("failed");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps worker composition generic without an active subscription", async () => {
    const client = await import("./client");
    const { readNotificationPolicy } = await import("./notificationPolicy");
    expect(await client.readPushState()).toMatchObject({ status: "off", categories: ["consejos"] });
    expect(await readNotificationPolicy()).toEqual([]);
  });

  it("publishes only saved categories for an existing subscription and fails closed for malformed choices", async () => {
    getSubscription.mockResolvedValue(subscription);
    const client = await import("./client");
    const { readNotificationPolicy } = await import("./notificationPolicy");
    expect(await client.readPushState()).toMatchObject({ status: "on" });
    expect(await readNotificationPolicy()).toEqual(["consejos"]);
    saved.set("mibebe.push.categories", "malformed");
    await client.readPushState();
    expect(await readNotificationPolicy()).toEqual([]);
  });

  it("keeps consent empty after sign-out, failed unsubscribe and a later passive read with retained health records", async () => {
    getSubscription.mockResolvedValue(subscription);
    unsubscribe.mockRejectedValueOnce(new Error("synthetic refusal"));
    const client = await import("./client");
    const { readNotificationPolicy } = await import("./notificationPolicy");
    const { composeAllowedNotification } = await import("./compose");
    await client.endPushForSignOut();
    expect(await readNotificationPolicy()).toEqual([]);
    expect(saved.get("mibebe.push.categories")).toBe("[]");
    expect(await client.readPushState()).toMatchObject({ status: "on", categories: [] });
    const categories = await readNotificationPolicy();
    expect(categories).toEqual([]);
    const now = Date.UTC(2026, 9, 23, 10);
    const companion = vi.fn(async () => now + 86_400_000);
    const cheer = vi.fn(async () => "abrazo");
    const notice = await composeAllowedNotification({ nextAppointment: now + 86_400_000, companionReminder: true, week: 22, birthDate: now - 7 * 86_400_000 }, categories, now, companion, cheer);
    expect(notice.body).toBe("Tocá para abrir la app.");
    expect(companion).not.toHaveBeenCalled();
    expect(cheer).not.toHaveBeenCalled();
  });
});
