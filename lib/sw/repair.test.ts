import { describe, expect, it, vi } from "vitest";
import { repairPrecache } from "./repair";

function storageFixture() {
  const buckets = new Map<string, Map<string, Response>>();
  const storage = {
    async open(name: string) {
      const data = buckets.get(name) ?? new Map<string, Response>();
      buckets.set(name, data);
      return {
        async match(key: string) { return data.get(key)?.clone(); },
        async put(key: string, response: Response) { data.set(key, response.clone()); },
      };
    },
    async delete(name: string) { return buckets.delete(name); },
  } as unknown as CacheStorage;
  return { storage, buckets };
}
const origin = "https://app.test";
const entries = new Map([
  [origin + "/emergencia", origin + "/emergencia?__WB_REVISION__=new"],
  [origin + "/semana/42", origin + "/semana/42?__WB_REVISION__=new"],
  [origin + "/_next/static/app.js", origin + "/_next/static/app.js"],
]);
const html = (text: string) => new Response(text, { headers: { "content-type": "text/html" } });

describe("repair preserves complete offline documents", () => {
  it("leaves the previous documents usable until every fresh download succeeds", async () => {
    const { storage, buckets } = storageFixture();
    const current = await storage.open("precache");
    await current.put(entries.get(origin + "/emergencia")!, html("old emergency"));
    await current.put(entries.get(origin + "/semana/42")!, html("old week"));
    await current.put(origin + "/_next/static/app.js", new Response("known immutable asset"));
    await (await storage.open("pages")).put(origin + "/stale", html("runtime"));
    await (await storage.open("notification-consent")).put(origin + "/choice", new Response("keep"));
    let release!: () => void;
    const delay = new Promise<void>(resolve => { release = resolve; });
    let started!: () => void;
    const waiting = new Promise<void>(resolve => { started = resolve; });
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/semana/42")) { started(); await delay; }
      return html('<script src="/_next/static/app.js"></script>fresh');
    });
    const repair = repairPrecache({ storage, cacheName: "precache", entries, pages: new Set(["/emergencia", "/semana/42"]), fetcher });
    await waiting;
    expect(await (await current.match(entries.get(origin + "/emergencia")!))!.text()).toBe("old emergency");
    release();
    await repair;
    expect(await (await current.match(entries.get(origin + "/semana/42")!))!.text()).toContain("fresh");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(buckets.has("pages")).toBe(false);
    expect(buckets.has("notification-consent")).toBe(true);
    expect([...buckets.keys()].filter(name => name.includes("-repair-"))).toEqual([]);
  });

  it("keeps old documents and runtime data when a later fetch fails", async () => {
    const { storage, buckets } = storageFixture();
    const current = await storage.open("precache");
    await current.put(entries.get(origin + "/emergencia")!, html("old emergency"));
    await current.put(entries.get(origin + "/semana/42")!, html("old week"));
    await storage.open("pages");
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/semana/42")) throw new Error("offline");
      return html("fresh");
    });
    await expect(repairPrecache({ storage, cacheName: "precache", entries, pages: new Set(["/emergencia", "/semana/42"]), fetcher })).rejects.toThrow("offline");
    expect(await (await current.match(entries.get(origin + "/emergencia")!))!.text()).toBe("old emergency");
    expect(buckets.has("pages")).toBe(true);
    expect([...buckets.keys()].filter(name => name.includes("-repair-"))).toEqual([]);
  });

  it("rejects HTML from a different deployment before replacing any document", async () => {
    const { storage } = storageFixture();
    const current = await storage.open("precache");
    await current.put(entries.get(origin + "/emergencia")!, html("old emergency"));
    await expect(repairPrecache({
      storage, cacheName: "precache", entries, pages: new Set(["/emergencia"]),
      fetcher: async () => html('<script src="/_next/static/unexpected-new-build.js"></script>'),
    })).rejects.toThrow("cambió");
    expect(await (await current.match(entries.get(origin + "/emergencia")!))!.text()).toBe("old emergency");
  });
});

it("times out a response body, preserves the prior copy, and permits a later repair", async () => {
  const { storage } = storageFixture();
  const key = entries.get(origin + "/emergencia")!;
  const current = await storage.open("precache");
  await current.put(key, html("prior complete document"));
  const fetcher: typeof fetch = async (_url, init) => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { init?.signal?.addEventListener("abort", () => controller.error(new Error("aborted")), { once: true }); },
    });
    return new Response(stream, { headers: { "content-type": "text/html" } });
  };
  const one = new Map([[origin + "/emergencia", key]]);
  await expect(repairPrecache({ storage, cacheName: "precache", entries: one, pages: new Set(["/emergencia"]), fetcher, resourceTimeoutMs: 15 })).rejects.toThrow();
  expect(await (await current.match(key))!.text()).toBe("prior complete document");
  await repairPrecache({ storage, cacheName: "precache", entries: one, pages: new Set(["/emergencia"]), fetcher: async () => html("recovered") });
  expect(await (await current.match(key))!.text()).toBe("recovered");
});
