import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { encryptNote, isPinSet, setPin } from "@/lib/crypto";
import { resetSyncAvailability, syncNow } from "@/lib/sync/client";
import { resumePhotoSyncAfterFailedWipe, syncPhotos } from "@/lib/photos/client";
import { wipeSignedOutDevice } from "@/lib/sync/deviceWipe";

beforeEach(() => {
  resetSyncAvailability();
  resumePhotoSyncAfterFailedWipe();
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal("location", { origin: "http://app.test" });
});

afterEach(() => {
  resetSyncAvailability();
  resumePhotoSyncAfterFailedWipe();
  vi.unstubAllGlobals();
});

describe("phone-only deletion", () => {
  it("signs out before erasing, and cannot rehydrate from the cloud on reload", async () => {
    let signedIn = true;
    await setPin("123456");
    await db().profile.add({ city: "Original", createdAt: 1 });
    await db().journalEntries.add({ week: 1, note: await encryptNote("private"), noteEncrypted: true, symptoms: [], createdAt: 1 } as never);
    const cloudCopy = { city: "Original" };
    vi.stubGlobal("fetch", async (input: string | URL) => {
      const url = new URL(String(input), "http://app.test");
      if (url.pathname.endsWith("auth-status")) return Response.json({ signedIn });
      return signedIn
        ? Response.json({ accountId: "owner", records: [{ store: "profile", recordId: "singleton", payload: cloudCopy }] })
        : Response.json({}, { status: 401 });
    });
    await wipeSignedOutDevice(async () => {
      expect(await db().profile.count()).toBe(1);
      signedIn = false;
    });
    expect(await db().profile.count()).toBe(0);
    expect(await db().journalEntries.count()).toBe(0);
    expect(isPinSet()).toBe(false);
    expect(cloudCopy).toEqual({ city: "Original" });
    resetSyncAvailability(); // simulate the next page load
    expect((await syncNow()).outcome).toBe("unavailable");
    expect(await db().profile.count()).toBe(0);
  });

  it("keeps all local data and PIN when sign-out cannot be confirmed", async () => {
    await setPin("123456");
    await db().profile.add({ city: "Keep me", createdAt: 1 });
    vi.stubGlobal("fetch", async () => Response.json({ signedIn: true }));
    await expect(wipeSignedOutDevice(async () => {})).rejects.toThrow("No pudimos completar");
    expect((await db().profile.toArray())[0]?.city).toBe("Keep me");
    expect(isPinSet()).toBe(true);
  });

  it("keeps local data when sign-out fails offline", async () => {
    await db().profile.add({ city: "Keep me", createdAt: 1 });
    await expect(wipeSignedOutDevice(async () => { throw new TypeError("offline"); })).rejects.toThrow();
    expect(await db().profile.count()).toBe(1);
  });

  it("aborts and awaits an in-flight sync before sign-out and erasure", async () => {
    await db().profile.add({ city: "Original", createdAt: 1 });
    const events: string[] = [];
    vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://app.test");
      if (url.pathname.endsWith("auth-status")) return Response.json({ signedIn: false });
      events.push("request");
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => { events.push("abort"); reject(new DOMException("aborted", "AbortError")); });
      });
    });
    const task = syncNow();
    await vi.waitFor(() => expect(events).toContain("request"));
    await wipeSignedOutDevice(async () => { events.push("signout"); });
    await task;
    expect(events).toEqual(["request", "abort", "signout"]);
    expect(await db().profile.count()).toBe(0);
  });

  it("awaits both text and photo writers before wiping", async () => {
    await db().profile.add({ city: "Original", photoBackup: true, createdAt: 1 });
    await db().syncState.put({ key: "default", lastPulledAt: 0, accountId: "owner" });
    const waiting: string[] = [];
    const stopped: string[] = [];
    // Signed in while the writers run (ensureAccountLink asks auth-status
    // first), signed out once the wipe has ended the session.
    let signedIn = true;
    vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://app.test");
      if (url.pathname.endsWith("auth-status")) return Response.json({ signedIn, accountId: signedIn ? "owner" : null });
      if (url.searchParams.get("since") === String(Number.MAX_SAFE_INTEGER)) return Response.json({ accountId: "owner" });
      if (init?.method === "POST") {
        const { records } = JSON.parse(String(init.body));
        return Response.json({ accountId: "owner", results: records.map((row: { store: string; recordId: string }) => ({
          store: row.store, recordId: row.recordId, outcome: "accepted",
        })) });
      }
      waiting.push(url.pathname);
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => { stopped.push(url.pathname); reject(new DOMException("aborted", "AbortError")); });
      });
    });
    const writers = [syncNow(), syncPhotos()];
    await vi.waitFor(() => expect(waiting).toHaveLength(2));
    await wipeSignedOutDevice(async () => {
      expect(stopped.sort()).toEqual(["/api/v1/photos", "/api/v1/sync"]);
      signedIn = false;
    });
    await Promise.all(writers);
    expect(await db().profile.count()).toBe(0);
  });
});
