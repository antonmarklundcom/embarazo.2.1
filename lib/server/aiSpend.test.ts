import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  aiBabyAlertShare,
  aiSpendReport,
  summariseMonth,
  type AiSpendStore,
  type GenerationRow,
} from "./aiSpend";

// BUILD-PLAN I4 — "what did AI cost this month" has to be arithmetic anyone
// can check by hand, so `summariseMonth` is tested with no database at all,
// the same way `quotaVerdict` is tested apart from `generateBabyImage`.

const env = process.env;

beforeEach(() => {
  process.env = { ...env };
});
afterEach(() => {
  process.env = env;
});

describe("summariseMonth", () => {
  const rows: GenerationRow[] = [
    { userId: "u1", status: "succeeded", costUsdMicros: 40_000 },
    { userId: "u1", status: "succeeded", costUsdMicros: 40_000 },
    { userId: "u1", status: "succeeded", costUsdMicros: 40_000 }, // u1 at quota (3)
    { userId: "u2", status: "succeeded", costUsdMicros: 40_000 },
    { userId: "u2", status: "pending", costUsdMicros: null },
    { userId: "u3", status: "failed", costUsdMicros: null },
  ];

  it("counts by status", () => {
    const report = summariseMonth("2026-09", rows, 3, 50);
    expect(report.ok).toBe(4);
    expect(report.pending).toBe(1);
    expect(report.failed).toBe(1);
  });

  it("sums spend from succeeded rows only, in USD", () => {
    const report = summariseMonth("2026-09", rows, 3, 50);
    // 4 succeeded × $0.04 = $0.16. A pending or failed row has no cost yet.
    expect(report.spendUsd).toBeCloseTo(0.16, 6);
  });

  it("never counts a failed generation toward a user's month", () => {
    const report = summariseMonth("2026-09", rows, 3, 50);
    // u1 and u2 have real generations; u3's only row is failed.
    expect(report.distinctUsers).toBe(2);
  });

  it("flags a user at or past quota", () => {
    const report = summariseMonth("2026-09", rows, 3, 50);
    expect(report.usersAtQuota).toBe(1); // u1 has 3, u2 has 2 (pending counts)
  });

  it("computes spend share against the ceiling", () => {
    const report = summariseMonth("2026-09", rows, 3, 0.16);
    expect(report.spendShare).toBeCloseTo(1, 6);
  });

  it("never divides by a zero ceiling", () => {
    const report = summariseMonth("2026-09", rows, 3, 0);
    expect(report.spendShare).toBe(0);
  });

  it("is all zero on an empty month", () => {
    const report = summariseMonth("2026-08", [], 3, 50);
    expect(report).toEqual({
      month: "2026-08",
      ok: 0,
      failed: 0,
      pending: 0,
      spendUsd: 0,
      ceilingUsd: 50,
      spendShare: 0,
      distinctUsers: 0,
      usersAtQuota: 0,
      quota: 3,
    });
  });
});

describe("aiSpendReport", () => {
  function memoryStore(byMonth: Record<string, GenerationRow[]>): AiSpendStore {
    return {
      async rowsForMonth(month) {
        return byMonth[month] ?? [];
      },
    };
  }

  it("reports this month first, then the previous one", async () => {
    process.env.AI_BABY_MONTHLY_QUOTA = "3";
    process.env.AI_BABY_MONTHLY_SPEND_CEILING_USD = "50";
    const store = memoryStore({
      "2026-09": [{ userId: "u1", status: "succeeded", costUsdMicros: 40_000 }],
      "2026-08": [{ userId: "u2", status: "succeeded", costUsdMicros: 40_000 }],
    });
    const report = await aiSpendReport(store, new Date("2026-09-15T00:00:00Z"));
    expect(report.map((r) => r.month)).toEqual(["2026-09", "2026-08"]);
    expect(report[0]!.ok).toBe(1);
    expect(report[1]!.ok).toBe(1);
  });

  it("crosses a year boundary correctly", async () => {
    const store = memoryStore({});
    const report = await aiSpendReport(store, new Date("2026-01-15T00:00:00Z"));
    expect(report.map((r) => r.month)).toEqual(["2026-01", "2025-12"]);
  });
});

describe("aiBabyAlertShare", () => {
  it("defaults to 0.8 when unset", () => {
    expect(aiBabyAlertShare({})).toBe(0.8);
  });

  it("defaults when empty or malformed, never to 'unlimited'", () => {
    expect(aiBabyAlertShare({ AI_BABY_ALERT_SHARE: "" })).toBe(0.8);
    expect(aiBabyAlertShare({ AI_BABY_ALERT_SHARE: "nope" })).toBe(0.8);
    expect(aiBabyAlertShare({ AI_BABY_ALERT_SHARE: "-1" })).toBe(0.8);
    expect(aiBabyAlertShare({ AI_BABY_ALERT_SHARE: "0" })).toBe(0.8);
  });

  it("reads a configured value", () => {
    expect(aiBabyAlertShare({ AI_BABY_ALERT_SHARE: "0.5" })).toBe(0.5);
  });
});
