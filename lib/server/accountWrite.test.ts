import { describe, expect, it } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { Database } from "./db";
import { AccountWriteDenied, withAccountWrite } from "./accountWrite";
import { drizzleAccountExecutor } from "./account";

function latch() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

// Models DB row locks, rather than mocking withAccountWrite or serialising all
// requests outside it. The production deletion UPDATE and writer SELECT FOR
// UPDATE must contend on the same key for these orderings to pass.
function lockedDatabase() {
  const accounts = new Map<string, { id: string; deletedAt: Date | null }>([
    ["owner", { id: "owner", deletedAt: null }],
    ["companion", { id: "companion", deletedAt: null }],
  ]);
  const queues = new Map<string, Promise<void>>();
  const locks: string[] = [];
  const keyOf = (clause: unknown) => String(new MySqlDialect().sqlToQuery(clause as never).params[0]);
  async function acquire(id: string) {
    const previous = queues.get(id) ?? Promise.resolve();
    const release = latch();
    queues.set(id, previous.then(() => release.promise));
    await previous;
    return release.resolve;
  }
  const database = {
    async transaction<T>(write: (transaction: unknown) => Promise<T>): Promise<T> {
      const releases: (() => void)[] = [];
      try {
        return await write({
          select: () => ({ from: () => ({ where: (clause: unknown) => ({ limit: () => ({
            for: async (mode: string) => {
              expect(mode).toBe("update");
              const id = keyOf(clause);
              releases.push(await acquire(id));
              locks.push(id);
              const row = accounts.get(id);
              return row ? [{ ...row }] : [];
            },
          }) }) }) }),
        });
      } finally { releases.reverse().forEach((release) => release()); }
    },
    update: () => ({ set: () => ({ where: async (clause: unknown) => {
      const id = keyOf(clause);
      const release = await acquire(id);
      const row = accounts.get(id);
      if (row) row.deletedAt = new Date();
      release();
    } }) }),
  };
  return { database: database as unknown as Database, accounts, locks };
}

describe("account erasure write barrier", () => {
  it("lets an earlier writer finish before markDeleting can commit", async () => {
    const { database, accounts } = lockedDatabase();
    const entered = latch(); const finish = latch();
    const data: string[] = [];
    const writer = withAccountWrite(database, "owner", async () => {
      entered.resolve(); await finish.promise; data.push("record");
    });
    await entered.promise;
    const erasure = drizzleAccountExecutor(database).markDeleting("owner");
    await Promise.resolve();
    expect(accounts.get("owner")!.deletedAt).toBeNull();
    finish.resolve(); await writer; await erasure;
    expect(data).toEqual(["record"]);
    expect(accounts.get("owner")!.deletedAt).toBeInstanceOf(Date);
    // The erasure cleanup now sees that committed record, not a late insert.
    data.length = 0;
    await expect(withAccountWrite(database, "owner", async () => { data.push("late"); })).rejects.toBeInstanceOf(AccountWriteDenied);
    expect(data).toEqual([]);
  });

  it("refuses a request that passed its old session check before erasure", async () => {
    const { database, accounts } = lockedDatabase();
    const oldSessionUserId = "owner";
    await drizzleAccountExecutor(database).markDeleting(oldSessionUserId);
    accounts.delete(oldSessionUserId);
    let wrote = false;
    await expect(withAccountWrite(database, oldSessionUserId, async () => { wrote = true; })).rejects.toBeInstanceOf(AccountWriteDenied);
    expect(wrote).toBe(false);
  });

  it("locks every companion/owner once in stable order and rejects a deleting owner", async () => {
    const { database, accounts, locks } = lockedDatabase();
    await withAccountWrite(database, ["owner", "companion", "owner"], async () => undefined);
    expect(locks).toEqual(["companion", "owner"]);
    accounts.get("owner")!.deletedAt = new Date();
    await expect(withAccountWrite(database, ["companion", "owner"], async () => "must not run")).rejects.toBeInstanceOf(AccountWriteDenied);
  });
});
