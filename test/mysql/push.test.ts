import { beforeAll, describe, expect, it } from "vitest";
import { mysqlEnabled } from "./setup";

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
});
