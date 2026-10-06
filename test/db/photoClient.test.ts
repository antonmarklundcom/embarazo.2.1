import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import {
  deleteRemotePhoto,
  pendingPhotoDeletions,
  setPhotoBackup,
  startPhotoSync,
  syncPhotos,
} from "@/lib/photos/client";
import { resetSyncAvailability } from "@/lib/sync/client";
import {
  allObjectKeys,
  listPhotos,
  markPhotoDeleted,
  photoRow,
  recordPhoto,
  forgetPhotoRow,
} from "@/lib/server/photos";
import type { PhotosBackend, StoredPhotoRow } from "@/lib/server/photosBackend";
import type { PhotoStore } from "@/lib/photos/keys";

// The real device half of photo backup (lib/photos/client.ts) against a small
// server built from the real rules in lib/server/photos.ts, a Map for MySQL and
// a Map for the bucket. Same decisions as app/api/v1/photos/route.ts.

const ME = "account-me";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

function memoryBackend(): PhotosBackend & { rows: Map<string, StoredPhotoRow & { userId: string }> } {
  const rows = new Map<string, StoredPhotoRow & { userId: string }>();
  const key = (u: string, s: string, r: string) => `${u}|${s}|${r}`;
  return {
    rows,
    async upsert(row) {
      const existing = rows.get(key(row.userId, row.store, row.recordId));
      if (existing) {
        if (existing.deletedAt === null || row.updatedAt > existing.deletedAt) Object.assign(existing, row);
        return;
      }
      rows.set(key(row.userId, row.store, row.recordId), { ...row });
    },
    async findObjectKey(u, s, r) {
      return rows.get(key(u, s, r))?.objectKey ?? null;
    },
    async findRow(u, s, r) {
      const row = rows.get(key(u, s, r));
      return row ? { objectKey: row.objectKey, deletedAt: row.deletedAt } : null;
    },
    async deleteRow(u, s, r) {
      rows.delete(key(u, s, r));
    },
    async markDeleted(u, s, r, fields) {
      const row = rows.get(key(u, s, r));
      if (row) Object.assign(row, fields);
    },
    async listSince(u, since) {
      return [...rows.values()].filter((row) => row.userId === u && row.serverUpdatedAt > since);
    },
    async allKeys(u) {
      return [...rows.values()]
        .filter((row) => row.userId === u)
        .map(({ store, recordId, objectKey }) => ({ store, recordId, objectKey }));
    },
    async deleteAllRows(u) {
      for (const [k, row] of rows) if (row.userId === u) rows.delete(k);
    },
  };
}

let backend: ReturnType<typeof memoryBackend>;
let bucket: Map<string, Uint8Array>;
let session: string | null;
let bucketDeleteFails: boolean;
let requests: string[];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function photosServer(init: RequestInit | undefined, url: URL): Promise<Response> {
  if (!session) return json({ error: "sesión requerida" }, 401);
  const stated = new Headers(init?.headers).get("x-mibebe-account");
  if (stated && stated !== session) return json({ error: "otra cuenta" }, 409);
  const user = session;
  if (!init?.method || init.method === "GET") {
    const since = Number(url.searchParams.get("since") ?? 0);
    const rows = await listPhotos(backend, user, since);
    return json({
      photos: rows.map((row) => ({ ...row, downloadUrl: row.deletedAt ? null : `https://bucket.test/${row.objectKey}` })),
    });
  }
  const data = JSON.parse(String(init.body));
  const objectKey = data.store ? `fotos/${user}/${data.store}/${data.recordId}` : "";
  if (data.action === "delete-all") {
    let pending = 0;
    for (const row of await allObjectKeys(backend, user)) {
      if (bucketDeleteFails) {
        pending += 1;
        continue;
      }
      bucket.delete(row.objectKey);
      await forgetPhotoRow(backend, user, row.store, row.recordId);
    }
    return pending > 0 ? json({ ok: false, pending }, 503) : json({ ok: true });
  }
  if (data.action === "upload-url") {
    const existing = await photoRow(backend, user, data.store, data.recordId);
    if (existing?.deletedAt != null) return json({ error: "foto borrada" }, 410);
    return json({ url: `https://bucket.test/${objectKey}` });
  }
  if (data.action === "confirm") {
    await recordPhoto(backend, user, { ...data, objectKey, payload: data.payload ?? null }, Date.now());
    const after = await photoRow(backend, user, data.store, data.recordId);
    if (after?.deletedAt != null) return json({ error: "foto borrada" }, 410);
    return json({ ok: true });
  }
  if (data.action === "delete") {
    const key = await markPhotoDeleted(backend, user, data.store as PhotoStore, data.recordId, Date.now());
    if (key && bucketDeleteFails) return json({ ok: false }, 503);
    if (key) bucket.delete(key);
    return json({ ok: true });
  }
  return json({ error: "?" }, 400);
}

beforeEach(() => {
  backend = memoryBackend();
  bucket = new Map();
  session = ME;
  bucketDeleteFails = false;
  requests = [];
  resetSyncAvailability();
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
  vi.stubGlobal("location", { origin: "http://app.test" });
  vi.stubGlobal("addEventListener", () => {});
  vi.stubGlobal("removeEventListener", () => {});
  vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://app.test");
    const action = typeof init?.body === "string" ? ` ${JSON.parse(init.body).action ?? ""}` : "";
    requests.push(`${init?.method ?? "GET"} ${url.pathname}${action}`);
    if (url.hostname === "bucket.test") {
      const objectKey = url.pathname.slice(1);
      if (init?.method === "PUT") {
        bucket.set(objectKey, new Uint8Array(await (init.body as Blob).arrayBuffer()));
        return new Response(null, { status: 200 });
      }
      const bytes = bucket.get(objectKey);
      return bytes ? new Response(new Blob([bytes as BlobPart], { type: "image/jpeg" })) : new Response(null, { status: 404 });
    }
    if (url.pathname === "/api/v1/sync") {
      return session ? json({ records: [], serverTime: Date.now(), accountId: session }) : json({ error: "x" }, 401);
    }
    return photosServer(init, url);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const jpeg = () => new Blob([Uint8Array.from([0xff, 0xd8, 0xff, 1, 2, 3])], { type: "image/jpeg" });

async function backupOn(linkedTo: string | undefined = ME) {
  await db().profile.add({ photoBackup: true, createdAt: 1 } as never);
  if (linkedTo) await db().syncState.put({ key: "default", lastPulledAt: 0, accountId: linkedTo });
}

describe("N2 — the marks are checked against the server", () => {
  it("re-uploads a photo marked uploaded whose server copy is gone", async () => {
    await backupOn();
    await db().photoEntries.add({ week: 12, blob: jpeg(), createdAt: 10, uploadedAt: 99 } as never);
    expect(backend.rows.size).toBe(0); // e.g. another device opted out: every copy deleted

    const summary = await syncPhotos();

    expect(summary).toMatchObject({ outcome: "ok", uploaded: 1 });
    expect(backend.rows.size).toBe(1);
  });
});

describe("F03 — deletions are jobs, not hopes", () => {
  it("an offline delete is queued, never restored, and sent when back online", async () => {
    await backupOn();
    const uid = "11111111-1111-4111-8111-111111111111";
    await db().photoEntries.add({ uid, week: 12, blob: jpeg(), createdAt: 10 } as never);
    await syncPhotos();
    expect(backend.rows.get(`${ME}|photoEntries|${uid}`)?.deletedAt).toBeNull();

    // Offline: the remote delete fails, the local row goes anyway.
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("offline");
    });
    await deleteRemotePhoto("photoEntries", uid);
    await db().photoEntries.where("uid").equals(uid).delete();
    expect(pendingPhotoDeletions()).toBe(1);
    vi.unstubAllGlobals();
    // Back online (restore the fake server).
    vi.stubGlobal("location", { origin: "http://app.test" });
    vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://app.test");
      if (url.hostname === "bucket.test") {
        const bytes = bucket.get(url.pathname.slice(1));
        return bytes ? new Response(new Blob([bytes as BlobPart])) : new Response(null, { status: 404 });
      }
      if (url.pathname === "/api/v1/sync") return json({ records: [], serverTime: Date.now(), accountId: ME });
      return photosServer(init, url);
    });

    await syncPhotos();

    expect(await db().photoEntries.where("uid").equals(uid).count()).toBe(0); // not resurrected
    expect(backend.rows.get(`${ME}|photoEntries|${uid}`)?.deletedAt).not.toBeNull();
    expect(pendingPhotoDeletions()).toBe(0);
  });

  it("a photo deleted on another device stays here but is never uploaded again", async () => {
    await backupOn();
    const uid = "22222222-2222-4222-8222-222222222222";
    await db().photoEntries.add({ uid, week: 12, blob: jpeg(), createdAt: 10 } as never);
    await syncPhotos();
    await markPhotoDeleted(backend, ME, "photoEntries", uid, Date.now());

    await syncPhotos();
    await syncPhotos();

    const local = await db().photoEntries.where("uid").equals(uid).first();
    expect(local).toBeDefined();
    expect(local?.remoteDeletedAt).toBeTypeOf("number");
    expect(backend.rows.get(`${ME}|photoEntries|${uid}`)?.deletedAt).not.toBeNull();
  });

  it("an opt-out the server could not complete is reported and retried", async () => {
    await backupOn();
    await db().photoEntries.add({ week: 12, blob: jpeg(), createdAt: 10 } as never);
    await syncPhotos();
    bucketDeleteFails = true;

    expect(await setPhotoBackup(false)).toBe("pending");
    expect(pendingPhotoDeletions()).toBe(1);
    expect(backend.rows.size).toBe(1); // the key is kept, not thrown away

    bucketDeleteFails = false;
    await syncPhotos();
    expect(pendingPhotoDeletions()).toBe(0);
    expect(backend.rows.size).toBe(0);
  });
});

describe("F01 — another account's phone sends nothing", () => {
  it("does not list, upload or download when the data belongs to another account", async () => {
    await backupOn("account-previous");
    await db().photoEntries.add({ week: 12, blob: jpeg(), createdAt: 10 } as never);
    await recordPhoto(backend, ME, { store: "photoEntries", recordId: "theirs", objectKey: "fotos/x", contentType: "image/jpeg", bytes: 6, payload: null, updatedAt: 1 }, 1);

    const summary = await syncPhotos();

    expect(summary.outcome).toBe("account-mismatch");
    expect(requests.filter((r) => r.includes("/api/v1/photos"))).toEqual([]);
    expect(await db().photoEntries.count()).toBe(1);
  });

  it("turning backup off on such a phone deletes nobody's copies", async () => {
    await backupOn("account-previous");
    await recordPhoto(backend, ME, { store: "photoEntries", recordId: "theirs", objectKey: "fotos/x", contentType: "image/jpeg", bytes: 6, payload: null, updatedAt: 1 }, 1);
    expect(await setPhotoBackup(false)).toBe("account-mismatch");
    expect(backend.rows.size).toBe(1);
  });
});

describe("F10 — it runs by itself", () => {
  it("a new phone with photoBackup synced restores without touching the switch", async () => {
    const uid = "33333333-3333-4333-8333-333333333333";
    bucket.set(`fotos/${ME}/photoEntries/${uid}`, Uint8Array.from([0xff, 0xd8, 0xff]));
    await recordPhoto(backend, ME, { store: "photoEntries", recordId: uid, objectKey: `fotos/${ME}/photoEntries/${uid}`, contentType: "image/jpeg", bytes: 3, payload: { week: 20, createdAt: 5 }, updatedAt: 5 }, 5);
    await backupOn();

    const stop = startPhotoSync(0);
    await vi.waitFor(async () => expect(await db().photoEntries.count()).toBe(1), { timeout: 3000 });
    stop();
    expect((await db().photoEntries.toArray())[0]?.week).toBe(20);
  });
});
