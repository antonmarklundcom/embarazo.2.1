import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  AUTH_STATUS_REUSE_MS,
  LOCAL_ONLY,
  clearAuthStatusCache,
  fetchAuthStatus,
  fetchAuthStatusOrNull,
  parseAuthStatus,
} from "./status";

describe("parseAuthStatus", () => {
  it("reads configured providers and the signed-in caller's own identifier", () => {
    expect(parseAuthStatus({ providers: ["google"], credentialsAvailable: true, signedIn: true, accountId: "owner" })).toEqual({
      providers: ["google"], credentialsAvailable: true, signedIn: true, accountRequired: true, accountId: "owner",
    });
  });
  it("never exposes an identifier for a signed-out caller", () => {
    expect(parseAuthStatus({ providers: ["google", "facebook"], credentialsAvailable: true, signedIn: false, accountId: "stale" })).toEqual({
      providers: ["google", "facebook"], credentialsAvailable: true, signedIn: false, accountRequired: true, accountId: null,
    });
  });
  it("drops unknown providers and retains legacy password login", () => {
    expect(parseAuthStatus({ providers: ["google", "myspace", 7, null], signedIn: false })).toEqual({
      ...LOCAL_ONLY, providers: ["google"],
    });
    expect(parseAuthStatus({ credentialsAvailable: true })).toEqual({ ...LOCAL_ONLY, credentialsAvailable: true });
  });
  it("fails closed when the server is unavailable or unreadable", () => {
    for (const body of [null, undefined, "<!doctype html>", 42, [], {}, { providers: "google" }, { signedIn: "yes" }]) {
      expect(parseAuthStatus(body)).toEqual(LOCAL_ONLY);
    }
  });
  it("only an explicit test-preview false can permit guest mode", () => {
    for (const accountRequired of [undefined, null, 0, "false"]) {
      expect(parseAuthStatus({ accountRequired }).accountRequired).toBe(true);
    }
    expect(parseAuthStatus({ accountRequired: false }).accountRequired).toBe(false);
  });
  it("rejects invalid ownership identities even with a signed-in flag", () => {
    for (const accountId of [null, 42, "", " ", "x".repeat(129)]) {
      expect(parseAuthStatus({ signedIn: true, accountId }).accountId).toBeNull();
    }
  });
  it("never treats truthy values as sessions or credentials", () => {
    expect(parseAuthStatus({ credentialsAvailable: "true", signedIn: "true" }).signedIn).toBe(false);
    expect(parseAuthStatus({ credentialsAvailable: 1, signedIn: 1 }).credentialsAvailable).toBe(false);
  });
});

describe("fetchAuthStatus sharing", () => {
  const signedIn = { providers: [], signedIn: true, accountId: "owner", accountRequired: true };
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  beforeEach(() => {
    vi.useFakeTimers();
    clearAuthStatusCache();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    clearAuthStatusCache();
  });

  it("concurrent callers share one request", async () => {
    const fetchMock = vi.fn(async () => ok(signedIn));
    vi.stubGlobal("fetch", fetchMock);
    const [a, b, c] = await Promise.all([fetchAuthStatus(), fetchAuthStatus(), fetchAuthStatus()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a.accountId).toBe("owner");
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });

  it("reuses a successful answer inside the window, then asks again", async () => {
    const fetchMock = vi.fn(async () => ok(signedIn));
    vi.stubGlobal("fetch", fetchMock);
    await fetchAuthStatus();
    vi.advanceTimersByTime(AUTH_STATUS_REUSE_MS - 1);
    await fetchAuthStatus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2);
    await fetchAuthStatus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never caches a failure: network error, non-2xx and bad body", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(new Response("nope", { status: 503 }))
      .mockResolvedValueOnce(new Response("<html>", { status: 200 }))
      .mockResolvedValue(ok(signedIn));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchAuthStatus()).toEqual(LOCAL_ONLY);
    expect(await fetchAuthStatusOrNull()).toBeNull();
    expect(await fetchAuthStatusOrNull()).toBeNull();
    expect((await fetchAuthStatus()).signedIn).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("fresh bypasses the reuse window", async () => {
    let n = 0;
    const fetchMock = vi.fn(async () => ok({ ...signedIn, accountId: `acct-${++n}` }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await fetchAuthStatus()).accountId).toBe("acct-1");
    expect((await fetchAuthStatus()).accountId).toBe("acct-1");
    expect((await fetchAuthStatus({ fresh: true })).accountId).toBe("acct-2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a request superseded by fresh cannot publish a stale answer", async () => {
    let release!: (r: Response) => void;
    const slow = new Promise<Response>((resolve) => { release = resolve; });
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(slow)
      .mockResolvedValue(ok({ providers: [], signedIn: false }));
    vi.stubGlobal("fetch", fetchMock);
    const stale = fetchAuthStatus();
    const current = await fetchAuthStatus({ fresh: true });
    expect(current.signedIn).toBe(false);
    release(ok(signedIn));
    expect((await stale).signedIn).toBe(true); // its own caller still gets its answer
    expect((await fetchAuthStatus()).signedIn).toBe(false); // but it did not become the shared one
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clearAuthStatusCache drops the recent answer", async () => {
    const fetchMock = vi.fn(async () => ok(signedIn));
    vi.stubGlobal("fetch", fetchMock);
    await fetchAuthStatus();
    clearAuthStatusCache();
    await fetchAuthStatus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
