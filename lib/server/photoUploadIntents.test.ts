import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { Database } from "./db";
import { photoBlobs, users } from "./schema";
import { listPhotos } from "./photos";
import type { PhotosBackend } from "./photosBackend";
import { rememberUploadIntent, retryUploadIntents, uploadIntentStore, uploadRetentionUntil, UPLOAD_CLEANUP_RETRY_MS } from "./photoUploadIntents";
import { drizzleAccountExecutor } from "./account";

const storage = vi.hoisted(() => ({ objects: new Set<string>(), fail: false, deleted: [] as string[] }));
vi.mock("./photoStorage", () => ({
  UPLOAD_URL_TTL_SECONDS: 900,
  deleteObject: async (_user: string, key: string) => {
    storage.deleted.push(key);
    if (storage.fail) return false;
    storage.objects.delete(key); return true;
  },
}));

type Row = Record<string, unknown>;
function fixture() {
  const photos: Row[] = [];
  const owners: Row[] = [{ id: "owner", deletedAt: null }];
  const query = (clause: unknown) => new MySqlDialect().sqlToQuery(clause as never);
  const selected = (table: unknown, clause: unknown) => {
    const { sql, params } = query(clause);
    if (table === users) return owners.filter((row) => row.id === params[0]);
    if (params.length === 1) return photos.filter((row) => row.userId === params[0]);
    if (sql.includes(" in ")) return photos.filter((row) =>
      params.slice(0, -2).includes(row.store) && Number(row.updatedAt) < Number(params.at(-2)) && Number(row.serverUpdatedAt) < Number(params.at(-1)));
    return photos.filter((row) => row.userId === params[0] && row.store === params[1] && row.recordId === params[2]);
  };
  const database = {
    transaction: async <T,>(run: (transaction: unknown) => Promise<T>) => run(database),
    select: () => ({ from: (table: unknown) => ({ where: (clause: unknown) => {
      const limited = (rows: Row[]) => (limit: number) => {
        const result = Promise.resolve(rows.slice(0, limit).map((row) => ({ ...row })));
        return Object.assign(result, { for: () => result });
      };
      const rows = selected(table, clause);
      return Object.assign(Promise.resolve(rows), { limit: limited(rows), orderBy: () => ({
        limit: limited([...rows].sort((a, b) => Number(a.serverUpdatedAt) - Number(b.serverUpdatedAt))),
      }) });
    } }) }),
    insert: (table: unknown) => ({ values: (row: Row) => ({ onDuplicateKeyUpdate: async () => {
      expect(table).toBe(photoBlobs);
      const existing = photos.find((value) => value.userId === row.userId && value.store === row.store && value.recordId === row.recordId);
      if (existing) {
        existing.updatedAt = Math.max(Number(existing.updatedAt), Number(row.updatedAt));
        existing.serverUpdatedAt = Math.max(Number(existing.serverUpdatedAt), Number(row.serverUpdatedAt));
      } else photos.push({ ...row });
    } }) }),
    update: (table: unknown) => ({ set: (fields: Row) => ({ where: async (clause: unknown) => {
      for (const row of selected(table, clause)) Object.assign(row, fields);
    } }) }),
    delete: (table: unknown) => ({ where: async (clause: unknown) => {
      const matches = selected(table, clause);
      for (const row of matches) photos.splice(photos.indexOf(row), 1);
    } }),
  };
  return { database: database as unknown as Database, photos, owners };
}
const NOW = 1_790_000_000_000;
const KEY = "fotos/owner/photoEntries/r1";
const EXPIRES = NOW + 900_000;

beforeEach(() => { vi.restoreAllMocks(); storage.objects.clear(); storage.deleted.length = 0; storage.fail = false; });

describe("durable signed-upload cleanup obligations", () => {
  it("records an opaque intent before URL delivery and extends it on reissue", async () => {
    const { database, photos } = fixture();
    await rememberUploadIntent(database, "owner", "photoEntries", "r1", KEY, NOW);
    expect(photos).toEqual([expect.objectContaining({ store: "upload:photoEntries", objectKey: KEY, bytes: 0, payload: null, updatedAt: EXPIRES, deletedAt: NOW })]);
    await rememberUploadIntent(database, "owner", "photoEntries", "r1", KEY, NOW + 1000);
    expect(photos).toHaveLength(1);
    expect(photos[0]!.updatedAt).toBe(EXPIRES + 1000);
  });

  it("never lists an intent as a user's photo or download", async () => {
    const { database, photos } = fixture();
    await rememberUploadIntent(database, "owner", "photoEntries", "r1", KEY, NOW);
    expect(await listPhotos({ listSince: async () => photos } as unknown as PhotosBackend, "owner")).toEqual([]);
  });

  it("retains the key before expiry and after cleaning an unconfirmed late PUT", async () => {
    const { database, photos, owners } = fixture();
    await rememberUploadIntent(database, "owner", "photoEntries", "r1", KEY, NOW);
    owners.length = 0;
    expect(await retryUploadIntents(database, uploadRetentionUntil(EXPIRES) - 1)).toBe(0);
    expect(storage.deleted).toEqual([]);
    storage.objects.add(KEY);
    const firstCleanup = uploadRetentionUntil(EXPIRES) + 1;
    expect(await retryUploadIntents(database, firstCleanup)).toBe(1);
    expect(storage.objects.has(KEY)).toBe(false);
    expect(photos).toHaveLength(1);
    expect(photos[0]!.payload).toBeNull();
    // A connection that began before URL expiry can finish much later than
    // the first successful DELETE. Its cleanup pointer must still exist.
    storage.objects.add(KEY);
    expect(await retryUploadIntents(database, firstCleanup + 24 * 60 * 60_000)).toBe(1);
    expect(storage.objects.has(KEY)).toBe(false);
    expect(photos).toHaveLength(1);
  });

  it("account erasure keeps the payload-free key even well after initial expiry", async () => {
    const { database, photos } = fixture();
    vi.spyOn(Date, "now").mockReturnValue(NOW + 24 * 60 * 60_000);
    await rememberUploadIntent(database, "owner", "photoEntries", "r1", KEY, NOW);
    storage.objects.add(KEY);
    await drizzleAccountExecutor(database).deletePhotoBlobs("owner");
    expect(storage.objects.has(KEY)).toBe(false);
    expect(photos).toHaveLength(1);
    expect(photos[0]!.objectKey).toBe(KEY);
  });

  it("keeps the obligation through provider failure and bounds repeated retries", async () => {
    const { database, photos } = fixture();
    await rememberUploadIntent(database, "owner", "photoEntries", "r1", KEY, NOW);
    storage.objects.add(KEY); storage.fail = true;
    const firstCleanup = uploadRetentionUntil(EXPIRES) + 1;
    expect(await retryUploadIntents(database, firstCleanup)).toBe(0);
    expect(photos).toHaveLength(1);
    storage.fail = false;
    expect(await retryUploadIntents(database, firstCleanup + 1)).toBe(0);
    expect(storage.deleted).toHaveLength(1);
    expect(await retryUploadIntents(database, firstCleanup + UPLOAD_CLEANUP_RETRY_MS + 1)).toBe(1);
    expect(storage.objects.size).toBe(0);
  });

  it("keeps a confirmed live photo's capability pointer for later erasure and replay", async () => {
    const { database, photos, owners } = fixture();
    await rememberUploadIntent(database, "owner", "photoEntries", "r1", KEY, NOW);
    photos.push({ userId: "owner", store: "photoEntries", recordId: "r1", objectKey: KEY, payload: { synthetic: true }, deletedAt: null });
    storage.objects.add(KEY);
    const firstCheck = uploadRetentionUntil(EXPIRES) + 1;
    expect(await retryUploadIntents(database, firstCheck)).toBe(0);
    expect(storage.deleted).toEqual([]);
    expect(photos.some((row) => row.store === uploadIntentStore("photoEntries"))).toBe(true);
    await drizzleAccountExecutor(database).deletePhotoBlobs("owner");
    owners.length = 0;
    expect(photos).toHaveLength(1);
    expect(photos[0]!.payload).toBeNull();
    storage.objects.add(KEY); // Old capability replay completes after erasure.
    expect(await retryUploadIntents(database, firstCheck + UPLOAD_CLEANUP_RETRY_MS + 1)).toBe(1);
    expect(storage.objects.has(KEY)).toBe(false);
  });

  it("rotates live and failing keys so later obligations are not starved", async () => {
    const { database } = fixture();
    for (let index = 1; index <= 3; index++) {
      await rememberUploadIntent(database, "owner", "photoEntries", `r${index}`, `fotos/owner/photoEntries/r${index}`, NOW);
    }
    const at = uploadRetentionUntil(EXPIRES) + 1;
    storage.fail = true;
    await retryUploadIntents(database, at, 1);
    await retryUploadIntents(database, at + 1, 1);
    storage.fail = false;
    await retryUploadIntents(database, at + 2, 1);
    expect(storage.deleted).toEqual(["fotos/owner/photoEntries/r1", "fotos/owner/photoEntries/r2", "fotos/owner/photoEntries/r3"]);
  });
});
