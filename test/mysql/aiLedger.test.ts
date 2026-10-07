import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

import { mysqlEnabled, sql } from "./setup";

// F16 against a real MySQL/MariaDB: the review's reproduction, kept as a test.
// A $0.12 ceiling and $0.04 per image. Three images fill the month; erasing
// the account that made them used to take the $0.12 back out of the total and
// let a fourth through. No model is called: the model is a fake, and the key
// is a dummy that only satisfies the "configured" check.

type Row = Record<string, unknown>;

describe.skipIf(!mysqlEnabled)("the AI spend ceiling on a real database", () => {
  let ai: typeof import("@/lib/server/aiBaby");
  let account: typeof import("@/lib/server/account");
  let db: typeof import("@/lib/server/db");
  const saved = { ...process.env };

  beforeAll(async () => {
    Object.assign(process.env, {
      AI_BABY_ENABLED: "true",
      GEMINI_API_KEY: "dummy-local-only",
      AI_BABY_MONTHLY_SPEND_CEILING_USD: "0.12",
      AI_BABY_COST_MICROS: "40000",
      AI_BABY_MONTHLY_QUOTA: "10",
    });
    ai = await import("@/lib/server/aiBaby");
    account = await import("@/lib/server/account");
    db = await import("@/lib/server/db");
  });
  afterAll(() => {
    process.env = saved;
  });

  const photos = [{ mimeType: "image/jpeg", data: "aaaa" }];
  const fakeModel = async () => ({ mimeType: "image/png", data: "generated" });
  const notPaused = async () => false;

  async function user(email: string): Promise<string> {
    const c = await sql();
    const id = randomUUID();
    await c.query("INSERT INTO users (id, email) VALUES (?, ?)", [id, email]);
    await c.end();
    return id;
  }

  async function rows(): Promise<Row[]> {
    const c = await sql();
    const [result] = await c.query("SELECT userId, status, costUsdMicros FROM aiGenerations");
    await c.end();
    return result as Row[];
  }

  it("F16: erasing the account that spent the month does not reopen it", async () => {
    const store = ai.drizzleQuotaStore(db.db());
    const spender = await user("spender@example.test");
    for (let i = 0; i < 3; i += 1) {
      const result = await ai.generateBabyImage(store, spender, photos, fakeModel, new Date(), notPaused);
      expect(result.ok).toBe(true);
    }

    await account.deleteAccountData(account.drizzleAccountExecutor(db.db()), spender);

    const other = await user("other@example.test");
    const result = await ai.generateBabyImage(store, other, photos, fakeModel, new Date(), notPaused);
    expect(result).toEqual({ ok: false, failure: "ceiling-exceeded" });

    const left = await rows();
    expect(left).toHaveLength(3);
    expect(left.every((r) => r.userId === ai.ERASED_AI_USER)).toBe(true);
    expect(left.reduce((sum, r) => sum + Number(r.costUsdMicros), 0)).toBe(120_000);
  });

  it("F16: a generation still in flight when its account is erased is billed to the month", async () => {
    const store = ai.drizzleQuotaStore(db.db());
    const id = await user("inflight@example.test");
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let called!: () => void;
    const reachedModel = new Promise<void>((r) => (called = r));
    const slowModel = async () => {
      called();
      await gate;
      return { mimeType: "image/png", data: "generated" };
    };

    const pending = ai.generateBabyImage(store, id, photos, slowModel, new Date(), notPaused);
    await reachedModel;
    await account.deleteAccountData(account.drizzleAccountExecutor(db.db()), id);
    release();
    expect((await pending).ok).toBe(true);

    expect(await rows()).toEqual([
      { userId: ai.ERASED_AI_USER, status: "succeeded", costUsdMicros: 40_000 },
    ]);
  });
});
