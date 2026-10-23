import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { resetSyncAvailability, syncNow } from "@/lib/sync/client";
import { exportCompleteness } from "@/lib/sync/status";
import { pullRecords, pushRecords, type StoredRecord, type SyncBackend } from "@/lib/server/sync";
import { PullQuerySchema, PushBatchSchema, partitionRecords } from "@/lib/sync/protocol";

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
      // Same steps as app/api/v1/sync/route.ts (N3: per-record judgement).
      const body = PushBatchSchema.parse(JSON.parse(String(init.body)));
      pushedRecords += body.records.length;
      const { valid, rejected } = partitionRecords(body.records);
      const result = await pushRecords(backend, USER, valid, Date.now());
      return Response.json({ ...result, results: [...result.results, ...rejected] });
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

describe("N3 — one bad record does not stop sync", () => {
  it("a row the v5 upgrade left at updatedAt 0 is pushed (as 1) and marked clean", async () => {
    await db().weightEntries.add({ uid: "pre-v5", date: 3, kg: 58, updatedAt: 0, dirty: 1, deletedAt: null } as never);
    expect((await syncNow()).outcome).toBe("ok");
    expect(backend.rows.get(`${USER}|weightEntries|pre-v5`)?.updatedAt).toBe(1);
    expect((await db().weightEntries.where("uid").equals("pre-v5").first())?.dirty).toBe(0);
  });

  it("a record the server rejects does not stop the rest, or the pull", async () => {
    await otherDevicePushes(Date.now() - 1000, 60); // something waiting to be pulled
    await db().journalEntries.add({ uid: "too-big", week: 1, symptoms: [], note: "x".repeat(70_000), createdAt: 5 } as never);
    await db().weightEntries.add({ uid: "fine", date: 4, kg: 59 } as never);

    await syncNow();

    expect(backend.rows.has(`${USER}|weightEntries|fine`)).toBe(true);
    expect(backend.rows.has(`${USER}|journalEntries|too-big`)).toBe(false);
    expect((await db().weightEntries.where("uid").equals("w1").first())?.kg).toBe(60);
  });
});

describe("the account cannot change during a sync", () => {
  it("carries the probed account on every real pull", async () => {
    const server = globalThis.fetch;
    const headers: (string | null)[] = [];
    vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://app.test");
      if (!init?.method && url.searchParams.get("since") !== String(Number.MAX_SAFE_INTEGER)) {
        headers.push(new Headers(init?.headers).get("x-mibebe-account"));
      }
      return server(input, init);
    });
    expect((await syncNow()).outcome).toBe("ok");
    expect(headers).toEqual([USER]);
  });

  it("refuses another account's response before records, epoch or cursor changes", async () => {
    await db().profile.add({ city: "Original", updatedAt: 10, createdAt: 1 });
    await db().syncState.put({ key: "default", accountId: USER, lastPulledAt: 500, epoch: 3 });
    const server = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://app.test");
      if (init?.method === "POST" || url.searchParams.get("since") === String(Number.MAX_SAFE_INTEGER)) return server(input, init);
      return Response.json({ accountId: "other-user", epoch: 99, records: [{
        store: "profile", recordId: "singleton", updatedAt: Date.now(),
        serverUpdatedAt: 999, deletedAt: null, payload: { city: "Other person's pregnancy" },
      }] });
    });

    expect((await syncNow()).outcome).toBe("account-mismatch");
    expect((await db().profile.toArray())[0]?.city).toBe("Original");
    expect(await db().conflicts.count()).toBe(0);
    expect(await db().syncState.get("default")).toMatchObject({ accountId: USER, lastPulledAt: 500, epoch: 3 });
  });

  it("does not pull after the server refuses a push for a changed session", async () => {
    await db().weightEntries.add({ date: 1, kg: 60 } as never);
    const server = globalThis.fetch;
    let realPulls = 0;
    vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://app.test");
      if (init?.method === "POST") return Response.json({ error: "otra cuenta" }, { status: 409 });
      if (url.searchParams.get("since") !== String(Number.MAX_SAFE_INTEGER)) realPulls += 1;
      return server(input, init);
    });
    expect((await syncNow()).outcome).toBe("account-mismatch");
    expect(realPulls).toBe(0);
    expect((await db().weightEntries.toArray())[0]?.dirty).toBe(1);
  });

  it("does not mark local edits clean when a push response names another account", async () => {
    await db().weightEntries.add({ date: 1, kg: 60 } as never);
    const server = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
      const result = await server(input, init);
      if (init?.method !== "POST") return result;
      return Response.json({ ...(await result.json()), accountId: "other-user" });
    });
    expect((await syncNow()).outcome).toBe("account-mismatch");
    expect((await db().weightEntries.toArray())[0]?.dirty).toBe(1);
  });

  it("checks identity again on later pull pages", async () => {
    const server = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://app.test");
      if (url.searchParams.get("since") === String(Number.MAX_SAFE_INTEGER)) return server(input, init);
      if (url.searchParams.has("cursor")) return Response.json({ accountId: "other-user", records: [{
        store: "journalEntries", recordId: "other-note", updatedAt: 10,
        serverUpdatedAt: 10, deletedAt: null, payload: { note: "Another person's note" },
      }] });
      return Response.json({ accountId: USER, nextCursor: "next-page", records: [{
        store: "weightEntries", recordId: "mine", updatedAt: 5,
        serverUpdatedAt: 5, deletedAt: null, payload: { date: 1, kg: 60 },
      }] });
    });
    expect((await syncNow()).outcome).toBe("account-mismatch");
    expect(await db().journalEntries.count()).toBe(0);
    expect((await db().weightEntries.toArray())[0]?.kg).toBe(60);
  });
});

describe("explicit backup joins an in-flight synchronization", () => {
  it("waits for remote-only records instead of accepting a busy result as complete", async () => {
    await otherDevicePushes(Date.now() - 1000, 62);
    const server = globalThis.fetch;
    let release!: () => void;
    const delay = new Promise<void>(resolve => { release = resolve; });
    let observed!: () => void;
    const blocked = new Promise<void>(resolve => { observed = resolve; });
    let firstRequest = true;
    vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
      if (firstRequest) { firstRequest = false; observed(); await delay; }
      return server(input, init);
    });
    const background = syncNow();
    await blocked;
    const explicit = syncNow({ waitForRunning: true });
    expect((await syncNow()).outcome).toBe("busy");
    release();
    expect((await background).outcome).toBe("ok");
    expect((await explicit).outcome).toBe("ok");
    expect((await db().weightEntries.where("uid").equals("w1").first())?.kg).toBe(62);
  });
});

describe("bounded pulls never confirm an incomplete account copy", () => {
  function paginatedFixture(total: number): number[] {
    const server = globalThis.fetch;
    const visited: number[] = [];
    vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://app.test");
      if (init?.method === "POST" || url.searchParams.get("since") === String(Number.MAX_SAFE_INTEGER)) return server(input, init);
      // One synthetic record per page exercises the real bound without
      // manufacturing 25,000 health records. Spacing exceeds pull overlap.
      const since = Number(url.searchParams.get("since"));
      const index = url.searchParams.has("cursor")
        ? Number(url.searchParams.get("cursor"))
        : Math.max(0, Math.ceil(since / 60_000) - 1);
      visited.push(index);
      return Response.json({ accountId: USER,
        ...(index + 1 < total ? { nextCursor: String(index + 1) } : {}),
        records: [{
          store: "weightEntries", recordId: `page-${index}`, updatedAt: (index + 1) * 60_000,
          serverUpdatedAt: (index + 1) * 60_000, deletedAt: null, payload: { date: index + 1, kg: 60 },
        }],
      });
    });
    return visited;
  }

  it("retains 50 fetched pages and progress, refuses completeness, then finishes page51 on retry", async () => {
    await db().syncState.put({ key: "default", accountId: USER, lastPulledAt: 0, lastSyncAt: 987 });
    const visited = paginatedFixture(51);
    const first = await syncNow();
    expect(first.outcome).toBe("error");
    expect(exportCompleteness(first.outcome)).toBe("local-only");
    expect(visited).toEqual(Array.from({ length: 50 }, (_, index) => index));
    expect(await db().weightEntries.count()).toBe(50);
    expect(await db().weightEntries.where("uid").equals("page-50").first()).toBeUndefined();
    expect(await db().syncState.get("default")).toMatchObject({
      lastPulledAt: 3_000_000, lastSyncAt: 987, lastError: expect.stringContaining("incompleta"),
    });
    expect((await db().weightEntries.where("uid").equals("page-49").first())?.dirty).toBe(0);

    const second = await syncNow();
    expect(second.outcome).toBe("ok");
    expect(exportCompleteness(second.outcome)).toBe("complete");
    expect(visited.slice(50)).toEqual([49, 50]);
    expect(await db().weightEntries.count()).toBe(51);
    const state = await db().syncState.get("default");
    expect(state?.lastPulledAt).toBe(3_060_000);
    expect(state?.lastSyncAt).toBeGreaterThan(987);
    expect(state?.lastError).toBeUndefined();
  });

  it("accepts exactly50 pages only when the final page has no continuation", async () => {
    const visited = paginatedFixture(50);
    const result = await syncNow();
    expect(result.outcome).toBe("ok");
    expect(exportCompleteness(result.outcome)).toBe("complete");
    expect(visited).toHaveLength(50);
    expect(await db().weightEntries.count()).toBe(50);
    expect((await db().syncState.get("default"))?.lastSyncAt).toBeGreaterThan(0);
  });

  it.each([["same", "same"], ["first", "second", "first"]])("stops repeating or cyclic cursors without confirming success: %j", async (...cursors: string[]) => {
    await db().syncState.put({ key: "default", accountId: USER, lastPulledAt: 0, lastSyncAt: 987 });
    const server = globalThis.fetch;
    let pages = 0;
    vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://app.test");
      if (init?.method === "POST" || url.searchParams.get("since") === String(Number.MAX_SAFE_INTEGER)) return server(input, init);
      const index = pages++;
      return Response.json({ accountId: USER, nextCursor: cursors[index % cursors.length], records: [{
        store: "weightEntries", recordId: `repeat-${index}`, updatedAt: (index + 1) * 60_000,
        serverUpdatedAt: (index + 1) * 60_000, deletedAt: null, payload: { date: index + 1, kg: 60 },
      }] });
    });
    const result = await syncNow();
    expect(result.outcome).toBe("error");
    expect(exportCompleteness(result.outcome)).toBe("local-only");
    expect(pages).toBe(cursors.length);
    expect(await db().weightEntries.count()).toBe(cursors.length);
    expect(await db().syncState.get("default")).toMatchObject({
      lastPulledAt: cursors.length * 60_000, lastSyncAt: 987, lastError: expect.stringContaining("incompleta"),
    });
  });
});
