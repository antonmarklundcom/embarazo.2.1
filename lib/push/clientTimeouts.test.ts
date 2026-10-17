import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: () => ({ profile: { toArray: async () => [] }, pregnancy: { toArray: async () => [] } }), notDeleted: (rows: unknown[]) => rows }));
vi.mock("@/lib/sync/client", () => ({ ACCOUNT_HEADER: "x-account", ensureAccountLink: async () => ({ status: "anonymous" }) }));
vi.mock("@/lib/sharing/client", () => ({ fetchSharedViews: async () => [] }));

// Fake timers: the 6 s passive wait, the 25 s explicit wait and the 4 s
// sign-out bound are the whole point of these, and none can be waited out.

const PUBLIC_KEY = "BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

describe("a slow first service-worker install", () => {
  const subscription = { endpoint: "https://fcm.googleapis.com/test-only", toJSON: () => ({ keys: { p256dh: "fixture", auth: "fixture" } }) };
  const permission = vi.fn(async () => "granted");
  const saved: Record<string, unknown>[] = [];
  const testCalls: string[] = [];
  let resolveReady: (registration: object) => void;
  const registration = {
    pushManager: { getSubscription: async () => null, subscribe: async () => subscription },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    saved.length = 0; testCalls.length = 0; permission.mockClear();
    const storage = new Map<string, string>();
    vi.stubGlobal("window", { PushManager: {}, Notification: {} });
    vi.stubGlobal("Notification", { permission: "default", requestPermission: permission });
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
    vi.stubGlobal("navigator", {
      userAgent: "Chrome",
      serviceWorker: { ready: new Promise((resolve) => { resolveReady = resolve; }) },
    });
    vi.stubGlobal("fetch", vi.fn(async (input: unknown, init?: RequestInit) => {
      if (String(input).endsWith("/push/test")) { testCalls.push(String(input)); return { status: 200, ok: true }; }
      if (init?.method === "POST") { saved.push(JSON.parse(init.body as string)); return { ok: true }; }
      return { ok: true, json: async () => ({ publicKey: PUBLIC_KEY }) };
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps the 6 s bound for passive reads", async () => {
    const client = await import("./client");
    let state: { status: string } | undefined;
    void client.readPushState().then((value) => { state = value; });
    await vi.advanceTimersByTimeAsync(5_900);
    expect(state).toBeUndefined();
    await vi.advanceTimersByTimeAsync(200);
    expect(state?.status).toBe("off");
  });

  it("waits past 6 s when she asked, and subscribes once the worker is up (13.5 s)", async () => {
    const client = await import("./client");
    let outcome: string | undefined;
    void client.enableWeekStartNotice().then((value) => { outcome = value; });
    await vi.advanceTimersByTimeAsync(13_500);
    expect(outcome).toBeUndefined();
    resolveReady(registration);
    await vi.advanceTimersByTimeAsync(0);
    expect(outcome).toBe("on");
    expect(saved[0]?.categories).toEqual(["consejos"]);
  });

  it("reports pending, not a refusal, when the worker is still not ready after 25 s", async () => {
    const client = await import("./client");
    let outcome: string | undefined;
    void client.enablePush().then((value) => { outcome = value; });
    await vi.advanceTimersByTimeAsync(24_900);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(200);
    expect(outcome).toBe("pending");
    expect(saved).toHaveLength(0);
  });

  it("gives the test notification the same long wait, and says pending rather than not-subscribed", async () => {
    const client = await import("./client");
    let outcome: string | undefined;
    void client.sendTestNotification().then((value) => { outcome = value; });
    await vi.advanceTimersByTimeAsync(24_900);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(200);
    expect(outcome).toBe("pending");
    expect(testCalls).toHaveLength(0);
  });
});

describe("ending push when leaving an account", () => {
  const unsubscribe = vi.fn(async () => true);
  const requests: { method?: string; body?: unknown }[] = [];
  let getSubscription: () => Promise<object | null>;
  let deleteBehaviour: () => Promise<unknown>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    requests.length = 0; unsubscribe.mockClear();
    getSubscription = async () => ({ endpoint: "https://fcm.googleapis.com/test-only", unsubscribe });
    deleteBehaviour = async () => ({ ok: true });
    vi.stubGlobal("window", { PushManager: {}, Notification: {} });
    vi.stubGlobal("Notification", { permission: "granted", requestPermission: vi.fn() });
    vi.stubGlobal("navigator", { userAgent: "Chrome", serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription: () => getSubscription() } }) } });
    vi.stubGlobal("fetch", vi.fn(async (_input: unknown, init?: RequestInit) => {
      requests.push({ method: init?.method, body: init?.body });
      return deleteBehaviour();
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("deletes the endpoint on the server and unsubscribes in the browser", async () => {
    const client = await import("./client");
    await client.endPushForSignOut();
    expect(requests).toEqual([{ method: "DELETE", body: JSON.stringify({ endpoint: "https://fcm.googleapis.com/test-only" }) }]);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("does nothing when this phone has no subscription", async () => {
    getSubscription = async () => null;
    const client = await import("./client");
    await client.endPushForSignOut();
    expect(requests).toHaveLength(0);
  });

  it("never throws, whatever fails", async () => {
    const client = await import("./client");
    deleteBehaviour = async () => { throw new TypeError("offline"); };
    await expect(client.endPushForSignOut()).resolves.toBeUndefined();
    expect(unsubscribe).toHaveBeenCalledOnce();

    unsubscribe.mockRejectedValueOnce(new Error("refused"));
    deleteBehaviour = async () => ({ ok: true });
    await expect(client.endPushForSignOut()).resolves.toBeUndefined();

    getSubscription = async () => { throw new Error("no push manager"); };
    await expect(client.endPushForSignOut()).resolves.toBeUndefined();
  });

  it("stops waiting after 4 s when the network hangs", async () => {
    deleteBehaviour = () => new Promise(() => {});
    const client = await import("./client");
    let finished = false;
    void client.endPushForSignOut().then(() => { finished = true; });
    await vi.advanceTimersByTimeAsync(3_900);
    expect(finished).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(finished).toBe(true);
    // The browser subscription is dropped even though the DELETE never answered.
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
