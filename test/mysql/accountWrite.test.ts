import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { mysqlEnabled, sql } from "./setup";

function latch() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
const pause = () => new Promise<void>((done) => setTimeout(done, 100));

describe.skipIf(!mysqlEnabled)("account erasure write barriers on a disposable database", () => {
  let barrier: typeof import("@/lib/server/accountWrite");
  let account: typeof import("@/lib/server/account");
  let db: typeof import("@/lib/server/db");
  let tables: typeof import("@/lib/server/schema");

  beforeAll(async () => {
    barrier = await import("@/lib/server/accountWrite");
    account = await import("@/lib/server/account");
    db = await import("@/lib/server/db");
    tables = await import("@/lib/server/schema");
  });

  async function seed(...ids: string[]) {
    const connection = await sql();
    try {
      for (const id of ids) await connection.query("INSERT INTO users (id, email) VALUES (?, ?)", [id, `${id}@example.test`]);
    } finally { await connection.end(); }
  }
  async function count(table: "users" | "syncRecords", id: string) {
    const connection = await sql();
    try {
      const column = table === "users" ? "id" : "userId";
      const [rows] = await connection.query(`SELECT COUNT(*) AS n FROM \`${table}\` WHERE \`${column}\` = ?`, [id]);
      return Number((rows as { n: number }[])[0]!.n);
    } finally { await connection.end(); }
  }
  function insertRecord(transaction: ReturnType<typeof db.db>, owner: string, recordId: string) {
    return transaction.insert(tables.syncRecords).values({
      userId: owner, store: "weightEntries", recordId,
      updatedAt: 1, serverUpdatedAt: 1, payload: { synthetic: true },
    });
  }

  it("erasure waits for an earlier writer to commit, then removes its committed data", async () => {
    await seed("writer-owner");
    const entered = latch(); const finish = latch();
    const writer = barrier.withAccountWrite(db.db(), "writer-owner", async (transaction) => {
      await insertRecord(transaction, "writer-owner", "before-delete");
      entered.resolve();
      await finish.promise;
    });
    await entered.promise;
    let erased = false;
    const deletion = account.deleteAccountData(account.drizzleAccountExecutor(db.db()), "writer-owner").then(() => { erased = true; });
    try {
      await pause();
      expect(erased).toBe(false);
      expect(await count("users", "writer-owner")).toBe(1);
    } finally { finish.resolve(); await writer; await deletion; }
    expect(await count("users", "writer-owner")).toBe(0);
    expect(await count("syncRecords", "writer-owner")).toBe(0);
    await expect(barrier.withAccountWrite(db.db(), "writer-owner", (transaction) => insertRecord(transaction, "writer-owner", "late").then(() => undefined)))
      .rejects.toBeInstanceOf(barrier.AccountWriteDenied);
    expect(await count("syncRecords", "writer-owner")).toBe(0);
  });

  it("a writer waiting behind the deletion transaction rechecks its committed marker", async () => {
    await seed("marked-owner");
    const entered = latch(); const finish = latch();
    const deletion = db.db().transaction(async (transaction) => {
      await transaction.update(tables.users).set({ deletedAt: new Date() }).where(eq(tables.users.id, "marked-owner"));
      entered.resolve(); await finish.promise;
    });
    await entered.promise;
    let wrote = false; let settled = false;
    const writer = barrier.withAccountWrite(db.db(), "marked-owner", async () => { wrote = true; })
      .then(() => ({ denied: false }), (error: unknown) => ({ denied: error instanceof barrier.AccountWriteDenied }))
      .finally(() => { settled = true; });
    try {
      await pause();
      expect(settled).toBe(false);
      expect(wrote).toBe(false);
    } finally { finish.resolve(); await deletion; }
    expect(await writer).toEqual({ denied: true });
    expect(wrote).toBe(false);
  });

  it("a companion write locks both identities and cannot outlive owner erasure", async () => {
    await seed("a-actor", "z-owner");
    const entered = latch(); const finish = latch();
    const writer = barrier.withAccountWrite(db.db(), ["z-owner", "a-actor", "z-owner"], async (transaction) => {
      await insertRecord(transaction, "z-owner", "companion-write");
      entered.resolve(); await finish.promise;
    });
    await entered.promise;
    let erased = false;
    const deletion = account.deleteAccountData(account.drizzleAccountExecutor(db.db()), "z-owner").then(() => { erased = true; });
    try {
      await pause();
      expect(erased).toBe(false);
    } finally { finish.resolve(); await writer; await deletion; }
    expect(await count("users", "a-actor")).toBe(1);
    expect(await count("syncRecords", "z-owner")).toBe(0);
    await expect(barrier.withAccountWrite(db.db(), ["a-actor", "z-owner"], async () => undefined))
      .rejects.toBeInstanceOf(barrier.AccountWriteDenied);
  });

  it("opposite actor/owner input order serializes without a lock-order deadlock", async () => {
    await seed("a-actor", "z-owner");
    const results = await Promise.all([
      barrier.withAccountWrite(db.db(), ["z-owner", "a-actor"], (transaction) => insertRecord(transaction, "z-owner", "first").then(() => "first")),
      barrier.withAccountWrite(db.db(), ["a-actor", "z-owner"], (transaction) => insertRecord(transaction, "z-owner", "second").then(() => "second")),
    ]);
    expect(results).toEqual(["first", "second"]);
    expect(await count("syncRecords", "z-owner")).toBe(2);
  });
});
