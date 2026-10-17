import { afterEach, describe, expect, it, vi } from "vitest";

import { requestPersistentStorage } from "./storagePersist";

// Node-only suite: `navigator.storage` is stubbed for each case. The browser
// decides silently on Android, so the only contract here is the return value
// and which of the two calls was made.

function stubStorage(storage: unknown) {
  vi.stubGlobal("navigator", { storage });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestPersistentStorage", () => {
  it("returns true without asking when the origin is already persistent", async () => {
    const persist = vi.fn(async () => true);
    stubStorage({ persisted: vi.fn(async () => true), persist });
    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it("asks and returns true when the browser grants persistence", async () => {
    const persist = vi.fn(async () => true);
    stubStorage({ persisted: vi.fn(async () => false), persist });
    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("asks and returns false when the browser denies persistence", async () => {
    const persist = vi.fn(async () => false);
    stubStorage({ persisted: vi.fn(async () => false), persist });
    await expect(requestPersistentStorage()).resolves.toBe(false);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("returns null when the storage API is missing", async () => {
    stubStorage(undefined);
    await expect(requestPersistentStorage()).resolves.toBeNull();
  });

  it("returns null when persist() is missing even though persisted() exists", async () => {
    stubStorage({ persisted: vi.fn(async () => false) });
    await expect(requestPersistentStorage()).resolves.toBeNull();
  });

  it("returns null when navigator itself is missing", async () => {
    vi.stubGlobal("navigator", undefined);
    await expect(requestPersistentStorage()).resolves.toBeNull();
  });

  it("returns null and does not throw when persisted() throws", async () => {
    const persist = vi.fn(async () => true);
    stubStorage({
      persisted: vi.fn(async () => {
        throw new Error("boom");
      }),
      persist,
    });
    await expect(requestPersistentStorage()).resolves.toBeNull();
    expect(persist).not.toHaveBeenCalled();
  });

  it("returns null and does not throw when persist() rejects", async () => {
    stubStorage({
      persisted: vi.fn(async () => false),
      persist: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    await expect(requestPersistentStorage()).resolves.toBeNull();
  });
});
