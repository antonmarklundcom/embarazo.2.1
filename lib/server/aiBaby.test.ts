import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  generateBabyImage,
  quotaMonthOf,
  quotaSnapshot,
  type ImageModel,
  type QuotaStore,
  type Reservation,
} from "./aiBaby";
import type { ParentPhoto } from "@/lib/ai/babyImage";

// BUILD-PLAN F2: "quota cannot be bypassed by a client". The client is not in
// this test at all, and that is the point — every number the decision uses
// comes from the same table the pipeline writes, so there is nothing in a
// request body that could move it. What these tests check is the part that
// could still go wrong: the counting, the ordering, and what happens when two
// requests arrive at once.
//
// The store is in-memory, like A5's deletion executor, so the guarantee is
// provable in CI with no MySQL.

interface Row {
  id: string;
  userId: string;
  quotaMonth: string;
  status: "pending" | "succeeded" | "failed";
  costUsdMicros: number | null;
}

function memoryStore() {
  const rows: Row[] = [];
  const store: QuotaStore = {
    async reserve(row: Reservation) {
      rows.push({ ...row, status: "pending", costUsdMicros: null });
    },
    async release(id) {
      const at = rows.findIndex((row) => row.id === id);
      if (at >= 0) rows.splice(at, 1);
    },
    async finish(id, costUsdMicros) {
      const row = rows.find((r) => r.id === id);
      if (row) Object.assign(row, { status: "succeeded", costUsdMicros });
    },
    async fail(id) {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = "failed";
    },
    async countForUser(userId, month) {
      return rows.filter(
        (row) =>
          row.userId === userId &&
          row.quotaMonth === month &&
          row.status !== "failed",
      ).length;
    },
    async monthSpend(month) {
      const inMonth = rows.filter((row) => row.quotaMonth === month);
      return {
        succeededMicros: inMonth
          .filter((row) => row.status === "succeeded")
          .reduce((total, row) => total + (row.costUsdMicros ?? 0), 0),
        pendingCount: inMonth.filter((row) => row.status === "pending").length,
      };
    },
  };
  return { store, rows };
}

const PHOTOS: ParentPhoto[] = [{ mimeType: "image/jpeg", data: "aaaa" }];
const NOW = new Date("2026-08-13T10:00:00Z");

const env = process.env;

beforeEach(() => {
  process.env = {
    ...env,
    AI_BABY_ENABLED: "true",
    GEMINI_API_KEY: "test-key",
    AI_BABY_COST_MICROS: "40000",
    AI_BABY_MONTHLY_QUOTA: "3",
    AI_BABY_MONTHLY_SPEND_CEILING_USD: "50",
  };
});

afterEach(() => {
  process.env = env;
});

describe("quotaMonthOf", () => {
  it("is a UTC calendar month", () => {
    expect(quotaMonthOf(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01");
    expect(quotaMonthOf(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12");
    // Asunción is UTC−3/−4: a local 31 December evening is already January in
    // UTC. That is fine — the window just has to be the same one on both the
    // count and the insert, and it is.
    expect(quotaMonthOf(new Date("2026-08-01T02:00:00Z"))).toBe("2026-08");
  });
});

describe("the per-user monthly quota", () => {
  it("allows exactly the configured number and then refuses", async () => {
    const { store, rows } = memoryStore();
    let calls = 0;
    const model: ImageModel = async () => {
      calls += 1;
      return { mimeType: "image/png", data: "generated" };
    };

    for (let i = 0; i < 3; i += 1) {
      const result = await generateBabyImage(store, "u1", PHOTOS, model, NOW);
      expect(result.ok, `generation ${i + 1} should be allowed`).toBe(true);
    }

    const fourth = await generateBabyImage(store, "u1", PHOTOS, model, NOW);
    expect(fourth).toEqual({ ok: false, failure: "quota-exceeded" });
    // The refusal never reached the model, which is the only thing that costs
    // money — the limit is not "we spent it and then apologised".
    expect(calls).toBe(3);
    expect(rows.filter((row) => row.status === "succeeded")).toHaveLength(3);
  });

  it("releases the refused reservation instead of leaving a row behind", async () => {
    const { store, rows } = memoryStore();
    process.env.AI_BABY_MONTHLY_QUOTA = "0";

    const result = await generateBabyImage(store, "u1", PHOTOS, undefined, NOW);
    expect(result).toEqual({ ok: false, failure: "quota-exceeded" });
    // A refusal is not a failure: leaving the row would show up in I4's
    // failure count and in next month's arithmetic as something that happened.
    expect(rows).toHaveLength(0);
  });

  it("counts per user, not globally", async () => {
    const { store } = memoryStore();
    const model: ImageModel = async () => ({
      mimeType: "image/png",
      data: "generated",
    });
    for (let i = 0; i < 3; i += 1) {
      await generateBabyImage(store, "u1", PHOTOS, model, NOW);
    }
    expect((await generateBabyImage(store, "u2", PHOTOS, model, NOW)).ok).toBe(
      true,
    );
  });

  it("counts per month, not for ever", async () => {
    const { store } = memoryStore();
    const model: ImageModel = async () => ({
      mimeType: "image/png",
      data: "generated",
    });
    for (let i = 0; i < 3; i += 1) {
      await generateBabyImage(store, "u1", PHOTOS, model, NOW);
    }
    const nextMonth = new Date("2026-09-01T00:00:00Z");
    expect(
      (await generateBabyImage(store, "u1", PHOTOS, model, nextMonth)).ok,
    ).toBe(true);
  });

  it("does not charge a month for a generation the model never delivered", async () => {
    const { store } = memoryStore();
    const broken: ImageModel = async () => null;
    for (let i = 0; i < 5; i += 1) {
      expect(await generateBabyImage(store, "u1", PHOTOS, broken, NOW)).toEqual({
        ok: false,
        failure: "no-image",
      });
    }
    const working: ImageModel = async () => ({
      mimeType: "image/png",
      data: "generated",
    });
    expect((await generateBabyImage(store, "u1", PHOTOS, working, NOW)).ok).toBe(
      true,
    );
  });

  it("cannot be beaten by two requests arriving together", async () => {
    // The reason the reservation is written *before* the count: with
    // count-then-reserve, both of these would read "2 used" and both would
    // proceed to a fourth generation.
    const { store } = memoryStore();
    const model: ImageModel = async () => ({
      mimeType: "image/png",
      data: "generated",
    });
    await generateBabyImage(store, "u1", PHOTOS, model, NOW);
    await generateBabyImage(store, "u1", PHOTOS, model, NOW);

    const both = await Promise.all([
      generateBabyImage(store, "u1", PHOTOS, model, NOW),
      generateBabyImage(store, "u1", PHOTOS, model, NOW),
    ]);
    // Both may be refused — erring towards refusing a request that would have
    // fitted, never towards spending money that was not there. What must never
    // happen is four successes.
    expect(both.filter((result) => result.ok).length).toBeLessThanOrEqual(1);
  });
});

describe("the global spend ceiling", () => {
  it("stops everyone once the month's budget is committed", async () => {
    const { store } = memoryStore();
    // $0.10 buys two images at $0.04 and refuses the third.
    process.env.AI_BABY_MONTHLY_SPEND_CEILING_USD = "0.1";
    process.env.AI_BABY_MONTHLY_QUOTA = "99";
    const model: ImageModel = async () => ({
      mimeType: "image/png",
      data: "generated",
    });

    expect((await generateBabyImage(store, "u1", PHOTOS, model, NOW)).ok).toBe(
      true,
    );
    expect((await generateBabyImage(store, "u2", PHOTOS, model, NOW)).ok).toBe(
      true,
    );
    // A different user, well inside their own quota, and still refused: the
    // ceiling is about the bill, not about any one person.
    expect(await generateBabyImage(store, "u3", PHOTOS, model, NOW)).toEqual({
      ok: false,
      failure: "ceiling-exceeded",
    });
  });

  it("counts in-flight generations, not just settled ones", async () => {
    const { store } = memoryStore();
    process.env.AI_BABY_MONTHLY_SPEND_CEILING_USD = "0.08";
    process.env.AI_BABY_MONTHLY_QUOTA = "99";

    // Three requests in flight at once, each $0.04 against an $0.08 ceiling.
    // If pending rows did not count, all three would read "$0 spent" and all
    // three would go through.
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const slow: ImageModel = async () => {
      await gate;
      return { mimeType: "image/png", data: "generated" };
    };

    const inFlight = [
      generateBabyImage(store, "a", PHOTOS, slow, NOW),
      generateBabyImage(store, "b", PHOTOS, slow, NOW),
      generateBabyImage(store, "c", PHOTOS, slow, NOW),
    ];
    release!();
    const results = await Promise.all(inFlight);
    expect(results.filter((result) => result.ok).length).toBeLessThanOrEqual(2);
  });
});

describe("the kill switch still wins", () => {
  it("refuses before touching the store", async () => {
    const { store, rows } = memoryStore();
    process.env.AI_BABY_ENABLED = "false";
    expect(await generateBabyImage(store, "u1", PHOTOS, undefined, NOW)).toEqual(
      { ok: false, failure: "disabled" },
    );
    expect(rows).toHaveLength(0);
  });

  it("refuses invalid photos before reserving anything", async () => {
    const { store, rows } = memoryStore();
    const result = await generateBabyImage(store, "u1", [], undefined, NOW);
    expect(result).toEqual({ ok: false, failure: "invalid" });
    expect(rows).toHaveLength(0);
  });
});

describe("quotaSnapshot", () => {
  it("reports what is left for the screen to show", async () => {
    const { store } = memoryStore();
    const model: ImageModel = async () => ({
      mimeType: "image/png",
      data: "generated",
    });
    expect(await quotaSnapshot(store, "u1", NOW)).toEqual({
      quota: 3,
      used: 0,
      remaining: 3,
    });
    await generateBabyImage(store, "u1", PHOTOS, model, NOW);
    expect(await quotaSnapshot(store, "u1", NOW)).toEqual({
      quota: 3,
      used: 1,
      remaining: 2,
    });
  });
});
