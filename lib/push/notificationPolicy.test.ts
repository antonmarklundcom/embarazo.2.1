import { afterEach, describe, expect, it, vi } from "vitest";
import { PUSH_POLICY_KEY, readNotificationPolicy, writeNotificationPolicy } from "./notificationPolicy";

afterEach(() => vi.unstubAllGlobals());

describe("worker-readable consent policy", () => {
  it("fails closed with missing, malformed, or refused cache data", async () => {
    for (const value of [undefined, "not json", JSON.stringify({ categories: ["recordatorios"] }), JSON.stringify(["consejos", 42])]) {
      vi.stubGlobal("caches", { open: async () => ({ match: async () => value === undefined ? undefined : new Response(value) }) });
      expect(await readNotificationPolicy()).toEqual([]);
    }
    vi.stubGlobal("caches", { open: async () => { throw new Error("refused"); } });
    expect(await readNotificationPolicy()).toEqual([]);
  });

  it("writes category choices and clears earlier consent before a quota failure", async () => {
    let stored: Response | undefined = new Response(JSON.stringify(["recordatorios"]));
    const cache = {
      match: async () => stored?.clone(),
      delete: vi.fn(async () => { stored = undefined; return true; }),
      put: vi.fn(async (_key: string, response: Response) => { stored = response; }),
    };
    vi.stubGlobal("caches", { open: async () => cache });
    await writeNotificationPolicy(["consejos"]);
    expect(cache.delete).toHaveBeenCalledWith(PUSH_POLICY_KEY);
    expect(await readNotificationPolicy()).toEqual(["consejos"]);
    cache.put.mockRejectedValueOnce(new Error("quota"));
    await writeNotificationPolicy([]);
    expect(await readNotificationPolicy()).toEqual([]);
  });

  it("serializes rapid choices so a slow earlier write cannot undo an opt-out", async () => {
    let stored: Response | undefined;
    let finishFirst!: () => void;
    let putCount = 0;
    const firstPut = new Promise<void>((resolve) => { finishFirst = resolve; });
    const cache = {
      match: async () => stored?.clone(),
      delete: async () => { stored = undefined; return true; },
      put: async (_key: string, response: Response) => {
        putCount += 1;
        if (putCount === 1) await firstPut;
        stored = response;
      },
    };
    vi.stubGlobal("caches", { open: async () => cache });
    const earlier = writeNotificationPolicy(["recordatorios"]);
    const optOut = writeNotificationPolicy([]);
    await vi.waitFor(() => expect(putCount).toBe(1));
    finishFirst();
    await Promise.all([earlier, optOut]);
    expect(await readNotificationPolicy()).toEqual([]);
    expect(putCount).toBe(2);
  });
});
