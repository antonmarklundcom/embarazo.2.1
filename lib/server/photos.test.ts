import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  allObjectKeys,
  deleteAllPhotoRows,
  listPhotos,
  markPhotoDeleted,
  recordPhoto,
} from "./photos";
import type { PhotosBackend, StoredPhotoRow } from "./photosBackend";
import type { PhotoStore } from "@/lib/photos/keys";

// K4, W5 — what the photo backup index decides, asserted.
//
// These run the real `lib/server/photos.ts` — the same functions `/api/v1/
// photos` calls, unmodified — with a Map underneath instead of MySQL, the
// same cut A3's `sync.test.ts` and V2's `sharing.test.ts` use. `lib/photos/
// routeContract.test.ts` still watches the route's own properties (the key
// built from the session, the whitelist, the TTLs).

function memoryBackend(): PhotosBackend & {
  rows: Map<string, StoredPhotoRow & { userId: string }>;
} {
  const rows = new Map<string, StoredPhotoRow & { userId: string }>();
  const key = (userId: string, store: string, recordId: string) =>
    `${userId}|${store}|${recordId}`;

  return {
    rows,

    async upsert(row) {
      const existing = rows.get(key(row.userId, row.store, row.recordId));
      // Mirrors the ON DUPLICATE KEY UPDATE: the primary key is (userId,
      // store, recordId), so a second upsert for the same photo replaces it
      // rather than adding a row.
      if (existing) {
        Object.assign(existing, row);
        return;
      }
      rows.set(key(row.userId, row.store, row.recordId), { ...row });
    },

    async findObjectKey(userId, store, recordId) {
      return rows.get(key(userId, store, recordId))?.objectKey ?? null;
    },

    async markDeleted(userId, store, recordId, fields) {
      const row = rows.get(key(userId, store, recordId));
      if (row) Object.assign(row, fields);
    },

    async listSince(userId, since) {
      return [...rows.values()]
        .filter((row) => row.userId === userId && row.serverUpdatedAt > since)
        .map((row): StoredPhotoRow => {
          const { userId: _omit, ...rest } = row;
          void _omit;
          return rest;
        });
    },

    async allKeys(userId) {
      return [...rows.values()]
        .filter((row) => row.userId === userId)
        .map(({ store, recordId, objectKey }) => ({ store, recordId, objectKey }));
    },

    async deleteAllRows(userId) {
      for (const [k, row] of rows) {
        if (row.userId === userId) rows.delete(k);
      }
    },
  };
}

const OWNER = "user-owner";
const STRANGER = "user-stranger";
const STORE: PhotoStore = "photoEntries";
const NOW = 1_760_000_000_000;

describe("recording a photo", () => {
  it("stores it live, with the given object key and payload", async () => {
    const backend = memoryBackend();

    await recordPhoto(
      backend,
      OWNER,
      { store: STORE, recordId: "r1", objectKey: "u/owner/r1.jpg", contentType: "image/jpeg", bytes: 1234, payload: { week: 20 }, updatedAt: NOW },
      NOW,
    );

    const row = backend.rows.get(`${OWNER}|${STORE}|r1`);
    expect(row).toMatchObject({
      objectKey: "u/owner/r1.jpg",
      payload: { week: 20 },
      deletedAt: null,
      serverUpdatedAt: NOW,
    });
  });

  it("stores a null payload when none is given", async () => {
    const backend = memoryBackend();

    await recordPhoto(
      backend,
      OWNER,
      { store: STORE, recordId: "r1", objectKey: "u/owner/r1.jpg", contentType: "image/jpeg", bytes: 1234, payload: undefined, updatedAt: NOW },
      NOW,
    );

    expect(backend.rows.get(`${OWNER}|${STORE}|r1`)?.payload).toBeNull();
  });

  it("replaces the same photo's row rather than adding a second one", async () => {
    const backend = memoryBackend();
    await recordPhoto(
      backend,
      OWNER,
      { store: STORE, recordId: "r1", objectKey: "old.jpg", contentType: "image/jpeg", bytes: 100, payload: null, updatedAt: NOW },
      NOW,
    );

    await recordPhoto(
      backend,
      OWNER,
      { store: STORE, recordId: "r1", objectKey: "new.jpg", contentType: "image/jpeg", bytes: 200, payload: null, updatedAt: NOW + 1000 },
      NOW + 1000,
    );

    expect(backend.rows.size).toBe(1);
    expect(backend.rows.get(`${OWNER}|${STORE}|r1`)?.objectKey).toBe("new.jpg");
  });

  it("clears a previous tombstone when the same photo is re-uploaded", async () => {
    const backend = memoryBackend();
    backend.rows.set(`${OWNER}|${STORE}|r1`, {
      userId: OWNER, store: STORE, recordId: "r1", objectKey: "old.jpg", contentType: "image/jpeg", bytes: 0, payload: null, updatedAt: NOW, deletedAt: NOW, serverUpdatedAt: NOW,
    });

    await recordPhoto(
      backend,
      OWNER,
      { store: STORE, recordId: "r1", objectKey: "new.jpg", contentType: "image/jpeg", bytes: 500, payload: { week: 22 }, updatedAt: NOW + 1000 },
      NOW + 1000,
    );

    expect(backend.rows.get(`${OWNER}|${STORE}|r1`)?.deletedAt).toBeNull();
  });
});

describe("deleting a photo", () => {
  async function seed(backend: ReturnType<typeof memoryBackend>): Promise<void> {
    await recordPhoto(
      backend,
      OWNER,
      { store: STORE, recordId: "r1", objectKey: "u/owner/r1.jpg", contentType: "image/jpeg", bytes: 1234, payload: { week: 20 }, updatedAt: NOW },
      NOW,
    );
  }

  it("tombstones the row and returns the object key to delete", async () => {
    const backend = memoryBackend();
    await seed(backend);

    const objectKey = await markPhotoDeleted(backend, OWNER, STORE, "r1", NOW + 1000);

    expect(objectKey).toBe("u/owner/r1.jpg");
    const row = backend.rows.get(`${OWNER}|${STORE}|r1`)!;
    expect(row.deletedAt).toBe(NOW + 1000);
    expect(row.payload).toBeNull();
    expect(row.bytes).toBe(0);
    expect(row.serverUpdatedAt).toBe(NOW + 1000);
  });

  it("keeps the row itself, as a tombstone, so a second device learns it is gone", async () => {
    const backend = memoryBackend();
    await seed(backend);

    await markPhotoDeleted(backend, OWNER, STORE, "r1", NOW + 1000);

    expect(backend.rows.has(`${OWNER}|${STORE}|r1`)).toBe(true);
  });

  it("reports a photo nobody uploaded as not found, not as an error", async () => {
    const backend = memoryBackend();

    expect(await markPhotoDeleted(backend, OWNER, STORE, "no-such-record", NOW)).toBeNull();
  });

  it("does not delete another account's photo of the same store and id", async () => {
    const backend = memoryBackend();
    await seed(backend);

    const objectKey = await markPhotoDeleted(backend, STRANGER, STORE, "r1", NOW + 1000);

    expect(objectKey).toBeNull();
    expect(backend.rows.get(`${OWNER}|${STORE}|r1`)?.deletedAt).toBeNull();
  });
});

describe("listing what an account has", () => {
  it("returns only what changed after the given cursor", async () => {
    const backend = memoryBackend();
    await recordPhoto(backend, OWNER, { store: STORE, recordId: "old", objectKey: "old.jpg", contentType: "image/jpeg", bytes: 1, payload: null, updatedAt: NOW - 5000 }, NOW - 5000);
    await recordPhoto(backend, OWNER, { store: STORE, recordId: "new", objectKey: "new.jpg", contentType: "image/jpeg", bytes: 1, payload: null, updatedAt: NOW }, NOW);

    const rows = await listPhotos(backend, OWNER, NOW - 1000);

    expect(rows.map((r) => r.recordId)).toEqual(["new"]);
  });

  it("never returns another account's photos", async () => {
    const backend = memoryBackend();
    await recordPhoto(backend, STRANGER, { store: STORE, recordId: "theirs", objectKey: "x.jpg", contentType: "image/jpeg", bytes: 1, payload: null, updatedAt: NOW }, NOW);

    const rows = await listPhotos(backend, OWNER, 0);

    expect(rows).toEqual([]);
  });

  it("includes a tombstone, so a second device learns a photo is gone", async () => {
    const backend = memoryBackend();
    await recordPhoto(backend, OWNER, { store: STORE, recordId: "r1", objectKey: "x.jpg", contentType: "image/jpeg", bytes: 1, payload: null, updatedAt: NOW }, NOW);
    await markPhotoDeleted(backend, OWNER, STORE, "r1", NOW + 1000);

    const rows = await listPhotos(backend, OWNER, 0);

    expect(rows).toEqual([expect.objectContaining({ recordId: "r1", deletedAt: NOW + 1000 })]);
  });
});

describe("the opt-out", () => {
  it("lists only this account's live object keys", async () => {
    const backend = memoryBackend();
    await recordPhoto(backend, OWNER, { store: STORE, recordId: "r1", objectKey: "mine.jpg", contentType: "image/jpeg", bytes: 1, payload: null, updatedAt: NOW }, NOW);
    await recordPhoto(backend, STRANGER, { store: STORE, recordId: "r2", objectKey: "theirs.jpg", contentType: "image/jpeg", bytes: 1, payload: null, updatedAt: NOW }, NOW);

    const keys = await allObjectKeys(backend, OWNER);

    expect(keys).toEqual([{ store: STORE, recordId: "r1", objectKey: "mine.jpg" }]);
  });

  it("drops every row for the account, and none of another's", async () => {
    const backend = memoryBackend();
    await recordPhoto(backend, OWNER, { store: STORE, recordId: "r1", objectKey: "mine.jpg", contentType: "image/jpeg", bytes: 1, payload: null, updatedAt: NOW }, NOW);
    await recordPhoto(backend, STRANGER, { store: STORE, recordId: "r2", objectKey: "theirs.jpg", contentType: "image/jpeg", bytes: 1, payload: null, updatedAt: NOW }, NOW);

    await deleteAllPhotoRows(backend, OWNER);

    expect(await listPhotos(backend, OWNER, 0)).toEqual([]);
    expect(await listPhotos(backend, STRANGER, 0)).toHaveLength(1);
  });
});

describe("the cut itself", () => {
  it("keeps photos.ts free of Drizzle entirely", () => {
    // The same discipline V2 documents for sharing.ts: nothing here builds a
    // query, so a page or a route that forgot to go through the backend has
    // no shortcut available to reach for.
    const source = readFileSync(join(process.cwd(), "lib", "server", "photos.ts"), "utf8");
    expect(source).not.toContain("drizzle-orm");
    expect(source).not.toContain('from "./schema"');
  });
});
