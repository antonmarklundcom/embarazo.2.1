import { afterEach, describe, expect, it } from "vitest";

import { PRIVATE_CACHE_NAMES, purgePrivateCaches } from "./privateCaches";

// K14, widened for K4 photo restore. The list is what sign-out and account
// deletion drop by name, so a cache `defaultCache` can fill with somebody's
// data and that is missing here is a copy that outlives the session.

const original = (globalThis as { caches?: unknown }).caches;

afterEach(() => {
  (globalThis as { caches?: unknown }).caches = original;
});

describe("PRIVATE_CACHE_NAMES", () => {
  it("names every defaultCache bucket a private response can land in", () => {
    expect([...PRIVATE_CACHE_NAMES].sort()).toEqual(
      [
        "apis",
        "pages",
        "pages-rsc",
        "pages-rsc-prefetch",
        "next-data",
        // defaultCache's catch-all for other origins — where a presigned photo
        // download from the bucket was being kept.
        "cross-origin",
      ].sort(),
    );
  });

  it("never names the caches that make the app work offline", () => {
    for (const name of ["mibebe-semanas", "mibebe-api", "static-image-assets"]) {
      expect(PRIVATE_CACHE_NAMES as readonly string[]).not.toContain(name);
    }
    expect(PRIVATE_CACHE_NAMES.some((name) => name.includes("precache"))).toBe(false);
  });
});

describe("purgePrivateCaches", () => {
  it("deletes each named cache, cross-origin included", async () => {
    const deleted: string[] = [];
    (globalThis as { caches?: unknown }).caches = {
      delete: async (name: string) => {
        deleted.push(name);
        return true;
      },
    };
    await purgePrivateCaches();
    expect(deleted.sort()).toEqual([...PRIVATE_CACHE_NAMES].sort());
    expect(deleted).toContain("cross-origin");
  });

  it("does not throw when one delete fails", async () => {
    (globalThis as { caches?: unknown }).caches = {
      delete: async () => {
        throw new Error("nope");
      },
    };
    await expect(purgePrivateCaches()).resolves.toBeUndefined();
  });
});
