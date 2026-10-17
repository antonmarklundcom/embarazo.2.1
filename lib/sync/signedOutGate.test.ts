import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// No account sync for signed-out visitors. These tests drive the real
// startSync/recheck code with a stubbed window, localStorage and fetch, and
// assert which URLs are requested. The Dexie layer is faked just enough for the
// sync probe to be reached; the ownership guards themselves are covered by
// test/db/syncClient.test.ts (unchanged).

vi.mock("@/lib/db", () => ({
  db: () => ({
    syncState: { get: async () => undefined },
    transaction: async () => { throw new Error("not reached in these tests"); },
  }),
  syncBookkeeping: async () => undefined,
}));

const VERIFIED_KEY = "mibebe.auth.offline.v1";
const REVOKED = "mibebe:account-access-revoked";

type Listener = (event: unknown) => void;
let listeners: Map<string, Set<Listener>>;
let store: Map<string, string>;
let urls: string[];
let authSignedIn: boolean | "error";

function emit(type: string, event: unknown = {}) {
  for (const l of [...(listeners.get(type) ?? [])]) l(event);
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

async function settle() {
  for (let i = 0; i < 20; i += 1) await new Promise((r) => setTimeout(r, 0));
}

async function load() {
  vi.resetModules();
  return import("./client");
}

beforeEach(() => {
  listeners = new Map();
  store = new Map();
  urls = [];
  authSignedIn = false;
  vi.stubGlobal("window", {
    location: { origin: "http://localhost" },
    addEventListener: (type: string, l: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(l);
    },
    removeEventListener: (type: string, l: Listener) => listeners.get(type)?.delete(l),
  });
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal("fetch", async (input: unknown) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("/api/v1/auth-status")) {
      if (authSignedIn === "error") throw new TypeError("offline");
      return jsonResponse({ providers: [], signedIn: authSignedIn, accountId: authSignedIn ? "owner" : null, accountRequired: true });
    }
    // The sync probe: a signed-out server answers 401; a signed-in one answers
    // with the account (the faked Dexie layer then ends the run in an error,
    // which is all these tests need: the probe was REACHED).
    if (authSignedIn === true) return jsonResponse({ accountId: "owner", records: [] });
    return jsonResponse({ error: "no" }, 401);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const syncCalls = () => urls.filter((u) => u.includes("/api/v1/sync"));
const statusCalls = () => urls.filter((u) => u.includes("/api/v1/auth-status"));

describe("signed-out visitors", () => {
  it("send no /api/v1/sync request on start, reconnect or a local change", async () => {
    const { startSync, scheduleSync } = await load();
    const stop = startSync();
    await settle();
    expect(syncCalls()).toEqual([]);
    expect(statusCalls().length).toBe(1);

    emit("online");
    scheduleSync(0);
    await settle();
    expect(syncCalls()).toEqual([]);
    stop();
  });

  it("do not sync after a failed auth-status either (cannot ask is not a sign-in)", async () => {
    authSignedIn = "error";
    const { startSync } = await load();
    const stop = startSync();
    await settle();
    expect(syncCalls()).toEqual([]);
    stop();
  });

  it("start syncing when a sign-in signal arrives in the same tab", async () => {
    const { startSync, recheckSyncSession } = await load();
    const stop = startSync();
    await settle();
    expect(syncCalls()).toEqual([]);

    authSignedIn = true;
    recheckSyncSession(); // route change after a soft-navigation sign-in
    await settle();
    expect(syncCalls().length).toBeGreaterThan(0);
    stop();
  });

  it("start syncing when another tab writes the verified-account marker", async () => {
    const { startSync } = await load();
    const stop = startSync();
    await settle();
    authSignedIn = true;
    emit("storage", { key: VERIFIED_KEY, newValue: "{}" });
    await settle();
    expect(syncCalls().length).toBeGreaterThan(0);
    stop();
  });

  it("start syncing when focus returns after a sign-in elsewhere", async () => {
    const { startSync } = await load();
    const stop = startSync();
    await settle();
    authSignedIn = true;
    emit("focus");
    await settle();
    expect(syncCalls().length).toBeGreaterThan(0);
    stop();
  });
});

describe("signed-in users", () => {
  it("confirmed by auth-status: the sync probe runs on start", async () => {
    authSignedIn = true;
    const { startSync } = await load();
    const stop = startSync();
    await settle();
    expect(statusCalls().length).toBe(1);
    expect(syncCalls().length).toBe(1);
    stop();
  });

  it("a phone with a verified-account marker goes straight to the probe (no extra request)", async () => {
    store.set(VERIFIED_KEY, "{}");
    const { startSync } = await load();
    const stop = startSync();
    await settle();
    expect(statusCalls()).toEqual([]);
    expect(syncCalls().length).toBe(1);
    stop();
  });

  it("is offline-safe: no request at all while offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { startSync } = await load();
    const stop = startSync();
    await settle();
    expect(urls).toEqual([]);
    stop();
  });

  it("a 401 on the probe holds sync; a fresh recheck that says signed in lifts it", async () => {
    store.set(VERIFIED_KEY, "{}");
    const { startSync, recheckSyncSession } = await load();
    const stop = startSync();
    await settle();
    expect(syncCalls().length).toBe(1); // marker was stale: 401, now on hold
    store.delete(VERIFIED_KEY);

    recheckSyncSession();
    await settle();
    expect(syncCalls().length).toBe(1); // auth-status says signed out: still no sync request

    authSignedIn = true;
    recheckSyncSession();
    await settle();
    expect(syncCalls().length).toBe(2);
    stop();
  });

  it("ACCESS_REVOKED_EVENT forgets the confirmed session and the cached answer", async () => {
    authSignedIn = true;
    const { startSync, recheckSyncSession } = await load();
    const stop = startSync();
    await settle();
    const before = statusCalls().length;
    recheckSyncSession(); // session confirmed: free
    await settle();
    expect(statusCalls().length).toBe(before);

    authSignedIn = false;
    emit(REVOKED);
    recheckSyncSession();
    await settle();
    expect(statusCalls().length).toBe(before + 1);
    stop();
  });
});

// Photos, the companion snapshot and push schedules ask `ensureAccountLink`
// before they send this phone's data. It used to open with the sync probe, so a
// signed-out visitor produced a 401 on `/api/v1/sync` from those paths too.
describe("ensureAccountLink (photos, sharing, push)", () => {
  it("signed out: no-session, and no /api/v1/sync request", async () => {
    const { ensureAccountLink } = await load();
    expect(await ensureAccountLink()).toEqual({ status: "no-session" });
    expect(syncCalls()).toEqual([]);
    expect(statusCalls().length).toBe(1);
  });

  it("cannot ask auth-status: offline, never a sign-out, and still no sync request", async () => {
    authSignedIn = "error";
    const { ensureAccountLink } = await load();
    expect(await ensureAccountLink()).toEqual({ status: "offline" });
    expect(syncCalls()).toEqual([]);
  });

  it("signed in: the identity probe is reached", async () => {
    authSignedIn = true;
    const { ensureAccountLink } = await load();
    await ensureAccountLink();
    expect(syncCalls().length).toBe(1);
  });

  it("a session this tab already confirmed skips the extra auth-status request", async () => {
    authSignedIn = true;
    const { startSync, ensureAccountLink } = await load();
    const stop = startSync();
    await settle();
    const before = statusCalls().length;
    await ensureAccountLink();
    expect(statusCalls().length).toBe(before);
    expect(syncCalls().length).toBe(2); // the engine's probe, then this one
    stop();
  });

  it("two callers on the same screen share one auth-status request", async () => {
    const { ensureAccountLink } = await load();
    await Promise.all([ensureAccountLink(), ensureAccountLink()]);
    expect(statusCalls().length).toBe(1);
    expect(syncCalls()).toEqual([]);
  });
});
