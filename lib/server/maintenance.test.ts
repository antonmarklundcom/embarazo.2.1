import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { Database } from "./db";
import { photoBlobs, verificationTokens } from "./schema";
import { runMaintenance } from "./maintenance";

const storage = vi.hoisted(() => ({
  deleted: [] as string[],
  failures: new Set<string>(),
}));
vi.mock("./account", () => ({ finishPendingDeletions: async () => 0 }));
// Keep the other independent queue still; its retained rows must never consume
// the ordinary orphan batch, even if it has more work than one tick can finish.
vi.mock("./photoUploadIntents", () => ({
  retryUploadIntents: async () => 0,
  isUploadIntentStore: (store: string) => store.startsWith("upload:"),
}));
vi.mock("./photoStorage", () => ({
  deleteObject: async (_userId: string, key: string) => {
    storage.deleted.push(key);
    return !storage.failures.has(key);
  },
}));

interface Photo {
  userId: string;
  store: string;
  recordId: string;
  objectKey: string;
  serverUpdatedAt: number;
}
const NOW = 1_790_000_000_000;
function fixture(ordinaryCount = 1) {
  const rows: Photo[] = [
    ...Array.from({ length: 125 }, (_, index) => ({
      userId: "erased-owner", store: "upload:photoEntries", recordId: String(index),
      objectKey: `fotos/erased-owner/photoEntries/intent-${index}`, serverUpdatedAt: 1,
    })),
    ...Array.from({ length: ordinaryCount }, (_, index) => ({
      userId: "erased-owner", store: index % 2 ? "carnePhotos" : "photoEntries", recordId: `orphan-${index}`,
      objectKey: `fotos/erased-owner/photoEntries/orphan-${index}`, serverUpdatedAt: 1,
    })),
  ];
  const query = (clause: unknown) => new MySqlDialect().sqlToQuery(clause as never);
  const database = {
    select: () => ({ from: (table: unknown) => ({
      leftJoin: () => ({ where: (clause: unknown) => ({
        limit: async (limit: number) => {
          expect(table).toBe(photoBlobs);
          const { sql, params } = query(clause);
          // Apply the actual emitted WHERE before slicing, as MySQL does.
          // Without its store predicate the retained keys occupy all 20 slots.
          const allowedStores = sql.includes(" in ") ? params.slice(0, -1) : null;
          const olderThan = Number(params.at(-1));
          return rows.filter((row) => row.serverUpdatedAt < olderThan &&
            (!allowedStores || allowedStores.includes(row.store))).slice(0, limit);
        },
      }) }),
    }) }),
    delete: (table: unknown) => ({ where: async (clause: unknown) => {
      if (table === verificationTokens) return [{ affectedRows: 0 }];
      expect(table).toBe(photoBlobs);
      const { params } = query(clause);
      const at = rows.findIndex((row) => row.userId === params[0] && row.store === params[1] && row.recordId === params[2]);
      if (at < 0) return [{ affectedRows: 0 }];
      rows.splice(at, 1);
      return [{ affectedRows: 1 }];
    } }),
  };
  return { database: database as unknown as Database, rows };
}

beforeEach(() => { storage.deleted.length = 0; storage.failures.clear(); });

describe("ordinary orphan-photo maintenance", () => {
  it("reaches an ordinary orphan behind more than 20 retained upload intents", async () => {
    const { database, rows } = fixture();
    expect((await runMaintenance(database, NOW)).orphanPhotosDeleted).toBe(1);
    expect(storage.deleted).toEqual(["fotos/erased-owner/photoEntries/orphan-0"]);
    expect(rows).toHaveLength(125);
    expect(rows.every((row) => row.store.startsWith("upload:"))).toBe(true);
  });

  it("keeps a failed object retry and reaches the next orphan", async () => {
    const { database, rows } = fixture(2);
    storage.failures.add("fotos/erased-owner/photoEntries/orphan-0");
    expect((await runMaintenance(database, NOW)).orphanPhotosDeleted).toBe(1);
    expect(rows.filter((row) => !row.store.startsWith("upload:"))).toHaveLength(1);
    storage.failures.clear();
    expect((await runMaintenance(database, NOW + 1)).orphanPhotosDeleted).toBe(1);
    expect(rows).toHaveLength(125);
  });

  it("keeps the ordinary batch bounded without consuming retained obligations", async () => {
    const { database, rows } = fixture(25);
    expect((await runMaintenance(database, NOW)).orphanPhotosDeleted).toBe(20);
    expect(rows.filter((row) => !row.store.startsWith("upload:"))).toHaveLength(5);
    expect(rows.filter((row) => row.store.startsWith("upload:"))).toHaveLength(125);
  });
});
