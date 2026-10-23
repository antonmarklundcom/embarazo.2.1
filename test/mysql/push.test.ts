import { beforeAll, describe, expect, it } from "vitest";
import { mysqlEnabled, sql } from "./setup";
import type { Database } from "@/lib/server/db";
import { pushSubscriptions } from "@/lib/server/schema";
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

});
