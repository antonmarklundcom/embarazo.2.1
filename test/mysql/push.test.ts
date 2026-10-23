import { beforeAll, describe, expect, it } from "vitest";
import { mysqlEnabled, sql } from "./setup";
import type { Database } from "@/lib/server/db";
import { pushSubscriptions, schema } from "@/lib/server/schema";
import { drizzle } from "drizzle-orm/mysql2";
import type { Connection } from "mysql2/promise";
import type { SQL } from "drizzle-orm";

describe.skipIf(!mysqlEnabled)("push schedules on a disposable MySQL database", () => {
  let push: typeof import("@/lib/server/push");
  let db: typeof import("@/lib/server/db");
  let backend: typeof import("@/lib/server/pushBackend");
  beforeAll(async () => {
    push = await import("@/lib/server/push");
    db = await import("@/lib/server/db");
    backend = await import("@/lib/server/pushBackend");
  });
  const real = () => backend.drizzlePushBackend(db.db());
  const endpoint = "https://fcm.googleapis.com/disposable-test-push";

  it("concurrent equal schedules commit only one event per category/time", async () => {
    await push.saveSubscription(real(), { endpoint, p256dh: "synthetic", auth: "synthetic", categories: ["consejos"], userId: null });
    await Promise.all(Array.from({ length: 6 }, () => push.scheduleReminders(real(), endpoint, "consejos", [100, 100, 200])));
    expect((await real().dueReminders(200, 100)).map((row) => row.fireAt)).toEqual([100, 200]);
  });

  it("concurrent different replacements never merge the two schedules", async () => {
    await push.saveSubscription(real(), { endpoint, p256dh: "synthetic", auth: "synthetic", categories: ["consejos"], userId: null });
    await Promise.all([push.scheduleReminders(real(), endpoint, "consejos", [100, 200]), push.scheduleReminders(real(), endpoint, "consejos", [300, 400])]);
    const times = (await real().dueReminders(500, 100)).map((row) => row.fireAt);
    expect([[100, 200], [300, 400]]).toContainEqual(times);
  });

  it("rotation racing a schedule does not multiply an equal destination event", async () => {
    const next = `${endpoint}-next`;
    for (const at of [endpoint, next]) {
      await push.saveSubscription(real(), { endpoint: at, p256dh: "synthetic", auth: "synthetic", categories: ["consejos"], userId: null });
      await push.scheduleReminders(real(), at, "consejos", [100]);
    }
    await Promise.all([push.rotateSubscription(real(), endpoint, { endpoint: next, p256dh: "synthetic", auth: "synthetic" }, 0), push.scheduleReminders(real(), next, "consejos", [100])]);
    expect(await real().dueReminders(100, 100)).toHaveLength(1);
  });
  it("concurrent first anonymous subscriptions both succeed on an initially missing endpoint", async () => {
    // The actual missing-key locking SELECTs both finish before either INSERT
    // starts. This reproduces the first-subscribe gap-lock race deterministically;
    // existing schedule tests begin with an already-created endpoint row.
    let reads = 0;
    let release!: () => void;
    const bothRead = new Promise<void>((resolve) => { release = resolve; });
    const synchronized = {
      transaction: <T,>(write: (transaction: Database) => Promise<T>) => db.db().transaction(async (transaction) => {
        let inserted = false;
        const wrapped = {
          select: (fields: { userId: typeof pushSubscriptions.userId }) => ({
            from: (table: typeof pushSubscriptions) => ({
              where: (clause: SQL | undefined) => ({
                for: async (mode: "update") => {
                  const rows = await transaction.select(fields).from(table).where(clause).for(mode);
                  // Synchronize only the vulnerable read-before-first-insert
                  // path. A unique-key insert first already owns the row; do
                  // not hold that owner's lock waiting for a blocked rival.
                  if (!inserted) {
                    reads += 1;
                    if (reads === 2) release();
                    await bothRead;
                  }
                  return rows;
                },
              }),
            }),
          }),
          insert: ((...args: Parameters<typeof transaction.insert>) => {
            inserted = true;
            return transaction.insert(...args);
          }) as typeof transaction.insert,
        };
        return write(wrapped as unknown as Database);
      }),
    } as unknown as Database;
    const fresh = `${endpoint}-first-save`;
    const firstBackend = () => backend.drizzlePushBackend(synchronized);
    const input = { endpoint: fresh, p256dh: "synthetic", auth: "synthetic", categories: ["consejos"], userId: null };
    const outcomes = await Promise.allSettled([push.saveSubscription(firstBackend(), input), push.saveSubscription(firstBackend(), input)]);
    for (const outcome of outcomes) if (outcome.status === "rejected") throw outcome.reason;
    expect(await real().subscriptionOf(fresh)).toEqual({ userId: null, categories: ["consejos"] });
  });

  it("a burst of first anonymous subscriptions leaves one endpoint with no rejected request", async () => {
    const fresh = `${endpoint}-first-stress`;
    await Promise.all(Array.from({ length: 6 }, () => push.saveSubscription(real(), {
      endpoint: fresh, p256dh: "synthetic", auth: "synthetic", categories: ["consejos"], userId: null,
    })));
    const connection = await sql();
    try {
      const [rows] = await connection.query("SELECT COUNT(*) AS n FROM pushSubscriptions WHERE endpoint = ?", [fresh]);
      expect(Number((rows as { n: number }[])[0]!.n)).toBe(1);
    } finally { await connection.end(); }
  });

  it("two anonymous rotations to one missing destination both converge without a deadlock", async () => {
    const destination = `${endpoint}-rotation-z-target`;
    const origins = [`${endpoint}-rotation-a`, `${endpoint}-rotation-b`];
    for (const origin of origins) {
      await push.saveSubscription(real(), { endpoint: origin, p256dh: "synthetic", auth: "synthetic", categories: ["consejos"], userId: null });
      await push.scheduleReminders(real(), origin, "consejos", [100]);
    }
    let reads = 0;
    let release!: () => void;
    const bothRead = new Promise<void>((resolve) => { release = resolve; });
    const driverFailures: string[] = [];
    const connections = await Promise.all([sql(), sql()]);
    const databases = connections.map((connection) => drizzle({
      async query(query: { sql: string } | string, params: unknown[] = []) {
        let result: Awaited<ReturnType<typeof connection.query>>;
        try { result = await connection.query(query as string, params); }
        catch (error) {
          if (error && typeof error === "object" && "code" in error) driverFailures.push(String(error.code));
          throw error;
        }
        const statement = typeof query === "string" ? query : query.sql;
        // Pause only the vulnerable locking read of a still-missing target.
        // An insert-first reservation returns an existing row and never waits.
        if (statement.startsWith("select") && statement.includes("for update") &&
            params[0] === destination && Array.isArray(result[0]) && result[0].length === 0) {
          reads += 1;
          if (reads === 2) release();
          await bothRead;
        }
        return result;
      },
    } as unknown as Connection, { schema, mode: "default" }));
    try {
      const { withAccountWrite } = await import("@/lib/server/accountWrite");
      const outcomes = await Promise.allSettled(databases.map((database, index) =>
        // The actual anonymous route has no account owners to serialize it.
        withAccountWrite(database, [], (transaction) => push.rotateSubscription(
          backend.drizzlePushBackend(transaction, []), origins[index]!,
          { endpoint: destination, p256dh: "synthetic", auth: "synthetic" }, 0,
        )),
      ));
      for (const outcome of outcomes) if (outcome.status === "rejected") throw new Error(`Rotation driver failures: ${driverFailures.join(", ")}`, { cause: outcome.reason });
      expect(outcomes.map((outcome) => outcome.status === "fulfilled" && outcome.value)).toEqual(["rotated", "rotated"]);
      expect(await real().dueReminders(100, 100)).toHaveLength(1);
      for (const origin of origins) expect(await real().subscriptionOf(origin)).toBeNull();
      expect(await real().subscriptionOf(destination)).toEqual({ userId: null, categories: ["consejos"] });
    } finally { await Promise.all(connections.map((connection) => connection.end())); }
  });

  it("an unknown old endpoint rolls back a provisionally reserved destination", async () => {
    const oldEndpoint = `${endpoint}-z-unknown-old`;
    const destination = `${endpoint}-a-unknown-target`;
    const { withAccountWrite } = await import("@/lib/server/accountWrite");
    expect(await withAccountWrite(db.db(), [], (transaction) => push.rotateSubscription(
      backend.drizzlePushBackend(transaction, []), oldEndpoint,
      { endpoint: destination, p256dh: "synthetic", auth: "synthetic" }, 0,
    ))).toBe("unknown");
    expect(await real().subscriptionOf(destination)).toBeNull();
    expect(await real().subscriptionOf(oldEndpoint)).toBeNull();
  });

});
