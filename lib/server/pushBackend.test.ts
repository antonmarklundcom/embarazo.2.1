import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/mysql2";
import type { Connection } from "mysql2/promise";
import { schema } from "./schema";
import { drizzlePushBackend } from "./pushBackend";
import { withAccountWrite } from "./accountWrite";

// Real Drizzle SQL and transaction code, fake driver. No database/credentials.
// Physical MySQL lock acceptance is in the opt-in test/mysql/push.test.ts.
function fixture(options: { missing?: boolean; failInsert?: boolean; owner?: string; guardedOwners?: readonly string[] } = {}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const client = {
    async query(query: { sql: string }, params: unknown[] = []) {
      const sql = query.sql;
      calls.push({ sql, params });
      if (sql.startsWith("select") && sql.includes("`users`")) return [[["authorized-owner", null]], []];
      if (sql.startsWith("select") && sql.includes("`pushSubscriptions`")) return [options.missing ? [] : [sql.startsWith("select `userId`") ? [options.owner ?? null] : ["subscription-id", options.owner ?? null]], []];
      if (sql.startsWith("select") && sql.includes("`pushReminders`")) return [[[100, 50], [200, null]], []];
      if (options.failInsert && sql.startsWith("insert")) throw new Error("synthetic insert failure");
      return [{ affectedRows: 1 }, []];
    },
  };
  const database = drizzle(client as unknown as Connection, { schema, mode: "default" });
  return { backend: drizzlePushBackend(database, options.guardedOwners), database, calls };
}

describe("atomic schedule replacement SQL", () => {
  it("locks the existing endpoint and reminders inside one transaction, deduplicates and excludes already sent events", async () => {
    const { backend, calls } = fixture();
    await backend.replacePendingReminders("endpoint-fixture", "consejos", [100, 200, 200, 300]);
    expect(calls.map((call) => call.sql.split(" ")[0])).toEqual(["begin", "select", "select", "delete", "insert", "commit"]);
    expect(calls[1]?.sql).toContain("for update");
    expect(calls[2]?.sql).toContain("for update");
    expect(calls[1]?.params).toEqual(["endpoint-fixture"]);
    expect(calls[3]?.sql).toContain("`pushReminders`.`sentAt` is null");
    const inserted = calls[4]!.params.filter((param) => typeof param === "number");
    expect(inserted).toEqual([200, 300]);
  });

  it("rolls back a failed replacement instead of committing an empty schedule", async () => {
    const { backend, calls } = fixture({ failInsert: true });
    await expect(backend.replacePendingReminders("endpoint-fixture", "consejos", [300])).rejects.toThrow();
    expect(calls.at(-1)?.sql).toBe("rollback");
    expect(calls.some((call) => call.sql === "commit")).toBe(false);
  });

  it("does not resurrect an endpoint removed while the request was waiting", async () => {
    const { backend, calls } = fixture({ missing: true });
    await backend.replacePendingReminders("endpoint-fixture", "consejos", [300]);
    expect(calls.map((call) => call.sql.split(" ")[0])).toEqual(["begin", "select", "commit"]);
  });

  it("refuses a subscription whose owner changed after account locks were acquired", async () => {
    const { backend, calls } = fixture({ owner: "other-owner", guardedOwners: ["authorized-owner"] });
    await expect(backend.replacePendingReminders("endpoint-fixture", "consejos", [300])).rejects.toMatchObject({ name: "AccountWriteDenied" });
    expect(calls.at(-1)?.sql).toBe("rollback");
    expect(calls.some((call) => call.sql.startsWith("delete"))).toBe(false);
  });

  it("refuses to rebind another non-null owner even when both accounts are live", async () => {
    const { backend, calls } = fixture({ owner: "old-owner", guardedOwners: ["old-owner", "new-owner"] });
    await expect(backend.upsertSubscription({ endpoint: "endpoint-fixture", categories: [], p256dh: "synthetic", auth: "synthetic", userId: "new-owner" })).rejects.toMatchObject({ name: "AccountWriteDenied" });
    expect(calls.some((call) => call.sql.startsWith("insert"))).toBe(false);
    expect(calls.at(-1)?.sql).toBe("rollback");
  });

  it("keeps anonymous coalescing while requiring a held lock for an existing owner", async () => {
    const allowed = fixture({ owner: "old-owner", guardedOwners: ["old-owner"] });
    await allowed.backend.upsertSubscription({ endpoint: "endpoint-fixture", categories: [], p256dh: "synthetic", auth: "synthetic", userId: null });
    expect(allowed.calls.some((call) => call.sql.includes("coalesce("))).toBe(true);
    const denied = fixture({ owner: "old-owner", guardedOwners: [] });
    await expect(denied.backend.upsertSubscription({ endpoint: "endpoint-fixture", categories: [], p256dh: "synthetic", auth: "synthetic", userId: null })).rejects.toMatchObject({ name: "AccountWriteDenied" });
  });

  it("uses savepoints within the account erasure barrier rather than committing its locks early", async () => {
    const { database, calls } = fixture({ owner: "authorized-owner" });
    await withAccountWrite(database, "authorized-owner", async (transaction) => {
      const guarded = drizzlePushBackend(transaction, ["authorized-owner"]);
      await guarded.upsertSubscription({ endpoint: "endpoint-fixture", categories: ["consejos"], p256dh: "synthetic", auth: "synthetic", userId: "authorized-owner" });
      await guarded.replacePendingReminders("endpoint-fixture", "consejos", [300]);
    });
    expect(calls.filter((call) => call.sql === "begin")).toHaveLength(1);
    expect(calls.filter((call) => call.sql === "commit")).toHaveLength(1);
    expect(calls.filter((call) => call.sql === "savepoint sp1")).toHaveLength(2);
    expect(calls.filter((call) => call.sql === "release savepoint sp1")).toHaveLength(2);
    expect(calls[1]?.sql).toContain("`users`");
    expect(calls[1]?.sql).toContain("for update");
    expect(calls.at(-1)?.sql).toBe("commit");
  });

  it("rolls the whole guarded request back when nested scheduling fails", async () => {
    const { database, calls } = fixture({ owner: "authorized-owner", failInsert: true });
    await expect(withAccountWrite(database, "authorized-owner", (transaction) =>
      drizzlePushBackend(transaction, ["authorized-owner"]).replacePendingReminders("endpoint-fixture", "consejos", [300]),
    )).rejects.toMatchObject({ cause: { message: "synthetic insert failure" } });
    expect(calls.some((call) => call.sql === "rollback to savepoint sp1")).toBe(true);
    expect(calls.at(-1)?.sql).toBe("rollback");
    expect(calls.some((call) => call.sql === "commit")).toBe(false);
  });
});

type RotationRow = { id: string; endpoint: string; category: string; fireAt: number; sentAt: number | null };
function rotationFixture(oldSentAt: number | null, newSentAt: number | null, destinationRow = true) {
  const rows = new Map<string, RotationRow>([
    ["old-id", { id: "old-id", endpoint: "old", category: "consejos", fireAt: 100, sentAt: oldSentAt }],
    ["new-id", { id: "new-id", endpoint: "new", category: "consejos", fireAt: 100, sentAt: newSentAt }],
  ]);
  if (!destinationRow) rows.delete("new-id");
  const endpoints = new Set(["old", "new"]);
  const calls: { sql: string; params: unknown[] }[] = [];
  const client = {
    async query(query: { sql: string }, params: unknown[] = []) {
      const sql = query.sql;
      calls.push({ sql, params });
      if (/^(begin|commit|rollback|savepoint|release savepoint)/.test(sql)) return [{ affectedRows: 0 }, []];
      if (sql.startsWith("select") && sql.includes("`pushSubscriptions`")) {
        const exists = endpoints.has(String(params[0]));
        if (sql.startsWith("select `userId`, `categories`")) return [exists ? [[null, '["consejos"]']] : [], []];
        if (sql.startsWith("select `userId`")) return [exists ? [[null]] : [], []];
        return [exists ? [[`subscription-${params[0]}`]] : [], []];
      }
      if (sql.startsWith("insert into `pushSubscriptions`")) return [{ affectedRows: 1 }, []];
      if (sql.startsWith("select") && sql.includes("`pushReminders`")) {
        return [[...rows.values()].filter((row) => row.endpoint === params[0])
          .map((row) => [row.id, row.category, row.fireAt, row.sentAt]), []];
      }
      if (sql.startsWith("delete from `pushReminders`")) {
        const ids = sql.includes("`id` in") ? params : [...rows.values()].filter((row) => row.endpoint === params[0]).map((row) => row.id);
        let affectedRows = 0;
        for (const id of ids) if (rows.delete(String(id))) affectedRows++;
        return [{ affectedRows }, []];
      }
      if (sql.startsWith("delete from `pushSubscriptions`")) {
        endpoints.delete(String(params[0])); return [{ affectedRows: 1 }, []];
      }
      if (sql.startsWith("update `pushReminders` set `endpoint`")) {
        for (const row of rows.values()) if (row.endpoint === params[1]) row.endpoint = String(params[0]);
        return [{ affectedRows: 1 }, []];
      }
      if (sql.startsWith("update `pushReminders` set `sentAt`")) {
        const claim = sql.includes("is null");
        const row = rows.get(String(claim ? params[1] : params.at(-1)));
        const eligible = row && (!claim || (row.sentAt === null && (params[2] === undefined || row.endpoint === params[2])));
        if (eligible) row.sentAt = params[0] === null ? null : Number(params[0]);
        return [{ affectedRows: eligible ? 1 : 0 }, []];
      }
      throw new Error(`Unexpected synthetic SQL: ${sql}`);
    },
  };
  const database = drizzle(client as unknown as Connection, { schema, mode: "default" });
  return { backend: drizzlePushBackend(database), rows, calls };
}

describe("rotation preserves delivery claims in real backend SQL", () => {
  it("migrates the old claimed ID/stamp and discards a pending destination duplicate", async () => {
    const { backend, rows, calls } = rotationFixture(50, null);
    expect(await backend.rotateSubscription("old", { endpoint: "new", p256dh: "synthetic", auth: "synthetic" })).toBe("rotated");
    expect([...rows.values()]).toEqual([{ id: "old-id", endpoint: "new", category: "consejos", fireAt: 100, sentAt: 50 }]);
    const reminderReads = calls.filter((call) => call.sql.startsWith("select") && call.sql.includes("`pushReminders`"));
    expect(reminderReads).toHaveLength(2);
    expect(reminderReads.every((call) => call.sql.includes("for update") && !call.sql.includes("is null"))).toBe(true);
  });

  it("a delayed failure releases the preserved claim for retry at the new endpoint", async () => {
    const { backend, rows } = rotationFixture(50, null);
    await backend.rotateSubscription("old", { endpoint: "new", p256dh: "synthetic", auth: "synthetic" });
    await backend.release("old-id");
    expect([...rows.values()]).toEqual([{ id: "old-id", endpoint: "new", category: "consejos", fireAt: 100, sentAt: null }]);
  });

  it("refuses an old-endpoint claim after rotation but accepts the same ID at the new endpoint", async () => {
    const { backend, rows, calls } = rotationFixture(null, null, false);
    await backend.rotateSubscription("old", { endpoint: "new", p256dh: "synthetic", auth: "synthetic" });
    expect(await backend.claim("old-id", 70, "old")).toBe(false);
    expect(rows.get("old-id")?.sentAt).toBeNull();
    expect(await backend.claim("old-id", 71, "new")).toBe(true);
    expect(rows.get("old-id")).toMatchObject({ endpoint: "new", sentAt: 71 });
    const claims = calls.filter((call) => call.sql.startsWith("update") && call.sql.includes("is null"));
    expect(claims.every((call) => call.sql.includes("`pushReminders`.`endpoint` = ?"))).toBe(true);
  });
  it("a claimed destination suppresses an equal pending source without changing its stamp", async () => {
    const { backend, rows } = rotationFixture(null, 60);
    await backend.rotateSubscription("old", { endpoint: "new", p256dh: "synthetic", auth: "synthetic" });
    expect([...rows.values()]).toEqual([{ id: "new-id", endpoint: "new", category: "consejos", fireAt: 100, sentAt: 60 }]);
  });
});
