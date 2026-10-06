import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { resetSyncAvailability, syncNow } from "@/lib/sync/client";
import { pullRecords, pushRecords, type StoredRecord, type SyncBackend } from "@/lib/server/sync";
import { PullQuerySchema, PushRequestSchema } from "@/lib/sync/protocol";

// The REAL device half of sync (lib/sync/client.ts) against the REAL server
// rules (lib/server/sync.ts), with a fetch that routes between them and a Map
// standing in for MySQL (same conditional last-write-wins as the SQL upsert).
//
// N7: a pulled record used to come out of `put` marked dirty, was echoed back
// on the next sync, and `markClean` then re-stamped its `updatedAt` to "now".
// A newer edit that another phone made offline — older than "now", newer than
// the copy here — then lost last-write-wins on this device and never showed.

const USER = "user-sync-test";

function memoryBackend(): SyncBackend & { rows: Map<string, StoredRecord> } {
  const rows = new Map<string, StoredRecord>();
  const key = (u: string, s: string, r: string) => `${u}|${s}|${r}`;
  return {
    rows,
    async getMany(userId, keys) {
      return keys
        .map((k) => rows.get(key(userId, k.store, k.recordId)))
        .filter((r): r is StoredRecord => r !== undefined);
    },
    async upsertMany(records) {
      for (const record of records) {
        const k = key(record.userId, record.store, record.recordId);
        const existing = rows.get(k);
        if (existing && existing.updatedAt >= record.updatedAt) continue;
        rows.set(k, {
          ...record,
          serverUpdatedAt: existing
            ? Math.max(record.serverUpdatedAt, existing.serverUpdatedAt + 1)
            : record.serverUpdatedAt,
        });
      }
    },
    async page(userId, from, limit) {
      return [...rows.values()]
        .filter((r) => r.userId === userId && r.serverUpdatedAt >= from.serverUpdatedAt)
        .sort((a, b) => a.serverUpdatedAt - b.serverUpdatedAt || a.recordId.localeCompare(b.recordId))
        .slice(0, limit);
    },
  };
}

let backend: ReturnType<typeof memoryBackend>;
let pushedRecords: number;

beforeEach(() => {
  backend = memoryBackend();
  pushedRecords = 0;
  resetSyncAvailability();
  vi.stubGlobal("location", { origin: "http://app.test" });
  vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://app.test");
    if (init?.method === "POST") {
      const body = PushRequestSchema.parse(JSON.parse(String(init.body)));
      pushedRecords += body.records.length;
      return Response.json(await pushRecords(backend, USER, body.records, Date.now()));
    }
    const query = PullQuerySchema.parse({
      since: url.searchParams.get("since") ?? 0,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    return Response.json(await pullRecords(backend, USER, query, Date.now()));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** What another phone does: push its own edit with its own timestamp. */
async function otherDevicePushes(updatedAt: number, kg: number): Promise<void> {
  await pushRecords(
    backend,
    USER,
    [{ store: "weightEntries", recordId: "w1", updatedAt, deletedAt: null, payload: { date: 1, kg } }],
    Date.now(),
  );
}

describe("pulled records stay clean (N7)", () => {
  it("a pulled UPDATE over a clean row is not dirty and is not echoed back", async () => {
    const t1 = Date.now() - 100_000;
    await otherDevicePushes(t1, 60);
    await syncNow(); // insert
    await otherDevicePushes(t1 + 10, 61);
    await syncNow(); // update via put over the clean row

    const row = await db().weightEntries.where("uid").equals("w1").first();
    expect(row?.kg).toBe(61);
    expect(row?.dirty).toBe(0);
    expect(row?.updatedAt).toBe(t1 + 10);

    pushedRecords = 0;
    await syncNow();
    expect(pushedRecords).toBe(0);
    expect((await db().weightEntries.where("uid").equals("w1").first())?.updatedAt).toBe(t1 + 10);
  });

  it("a push does not move the local updatedAt past the server's", async () => {
    await db().weightEntries.add({ uid: "mine", date: 2, kg: 70 } as never);
    const written = (await db().weightEntries.where("uid").equals("mine").first())!.updatedAt;
    await syncNow();
    const row = await db().weightEntries.where("uid").equals("mine").first();
    expect(row?.dirty).toBe(0);
    expect(row?.updatedAt).toBe(written);
  });

  it("a newer edit made offline on another phone wins over this phone's older, already-pushed edit", async () => {
    const clock = vi.spyOn(Date, "now");
    try {
      clock.mockReturnValue(1_000_000_000_000);
      await otherDevicePushes(999_999_000_000, 60);
      await syncNow();

      // 10:00 — this phone edits and pushes straight away.
      clock.mockReturnValue(1_000_000_100_000);
      const row = (await db().weightEntries.where("uid").equals("w1").first())!;
      await db().weightEntries.update(row.id!, { kg: 61 });
      clock.mockReturnValue(1_000_000_200_000);
      await syncNow();

      // 10:01 — the other phone, offline, edits too; it reconnects at 11:00.
      clock.mockReturnValue(1_000_003_600_000);
      await otherDevicePushes(1_000_000_150_000, 65);
      await syncNow();

      const after = await db().weightEntries.where("uid").equals("w1").first();
      expect(backend.rows.get(`${USER}|weightEntries|w1`)?.payload).toMatchObject({ kg: 65 });
      expect(after?.kg).toBe(65);
    } finally {
      clock.mockRestore();
    }
  });

  it("a local edit is still stamped and pushed", async () => {
    const t1 = Date.now() - 100_000;
    await otherDevicePushes(t1, 60);
    await syncNow();
    const row = (await db().weightEntries.where("uid").equals("w1").first())!;
    await db().weightEntries.update(row.id!, { kg: 61 });
    const edited = await db().weightEntries.get(row.id!);
    expect(edited?.dirty).toBe(1);
    expect(edited!.updatedAt).toBeGreaterThan(t1);

    await syncNow();
    expect(backend.rows.get(`${USER}|weightEntries|w1`)?.payload).toMatchObject({ kg: 61 });
  });
});
