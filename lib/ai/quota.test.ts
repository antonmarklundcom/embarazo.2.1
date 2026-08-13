import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DEFAULT_CEILING_USD,
  DEFAULT_MONTHLY_QUOTA,
  aiBabyMonthlyQuota,
  aiBabySpendCeilingMicros,
  committedMicros,
  quotaVerdict,
  remainingGenerations,
} from "./quota";

// BUILD-PLAN F2. The property that matters is that **every wrong value means
// less spending, never more** — an unset var, a typo, a negative number, a
// lowered limit. Each of those is a test below rather than a comment, because
// this is the module standing between an env field and a Google bill.

describe("the per-user quota", () => {
  it("defaults to 3 when unset", () => {
    expect(aiBabyMonthlyQuota({})).toBe(DEFAULT_MONTHLY_QUOTA);
  });

  it("reads a configured value", () => {
    expect(aiBabyMonthlyQuota({ AI_BABY_MONTHLY_QUOTA: "5" })).toBe(5);
  });

  it("allows zero — the softest kill switch there is", () => {
    expect(aiBabyMonthlyQuota({ AI_BABY_MONTHLY_QUOTA: "0" })).toBe(0);
  });

  it("falls back rather than opening up on nonsense", () => {
    for (const value of ["", "muchas", "-1", "NaN", "Infinity"]) {
      expect(
        aiBabyMonthlyQuota({ AI_BABY_MONTHLY_QUOTA: value }),
        `"${value}" must not widen the quota`,
      ).toBe(DEFAULT_MONTHLY_QUOTA);
    }
  });

  it("floors a fractional value instead of rounding up", () => {
    expect(aiBabyMonthlyQuota({ AI_BABY_MONTHLY_QUOTA: "2.9" })).toBe(2);
  });
});

describe("the global spend ceiling", () => {
  it("defaults to a conservative figure when unset", () => {
    // Unset must not mean "unlimited": the default is exactly what protects a
    // deployment where somebody enabled the feature and forgot the ceiling.
    expect(aiBabySpendCeilingMicros({})).toBe(DEFAULT_CEILING_USD * 1_000_000);
  });

  it("converts USD to micros", () => {
    expect(
      aiBabySpendCeilingMicros({ AI_BABY_MONTHLY_SPEND_CEILING_USD: "120" }),
    ).toBe(120_000_000);
    expect(
      aiBabySpendCeilingMicros({ AI_BABY_MONTHLY_SPEND_CEILING_USD: "0.5" }),
    ).toBe(500_000);
  });

  it("accepts zero, and rejects nonsense", () => {
    expect(
      aiBabySpendCeilingMicros({ AI_BABY_MONTHLY_SPEND_CEILING_USD: "0" }),
    ).toBe(0);
    for (const value of ["", "cien", "-5"]) {
      expect(
        aiBabySpendCeilingMicros({ AI_BABY_MONTHLY_SPEND_CEILING_USD: value }),
        `"${value}" must not raise the ceiling`,
      ).toBe(DEFAULT_CEILING_USD * 1_000_000);
    }
  });
});

describe("committedMicros counts money in flight", () => {
  it("adds pending generations at the configured price", () => {
    // Counting only completed rows would let a burst of simultaneous requests
    // spend past the ceiling while each reads a total from before the burst.
    expect(
      committedMicros({
        succeededMicros: 80_000,
        pendingCount: 3,
        costMicros: 40_000,
      }),
    ).toBe(200_000);
  });
});

describe("quotaVerdict", () => {
  const base = { used: 1, quota: 3, committed: 40_000, ceiling: 50_000_000 };

  it("allows a request inside both limits", () => {
    expect(quotaVerdict(base)).toBe("ok");
  });

  it("allows the last generation of the month", () => {
    // `used` includes the request being decided, so used === quota is the
    // third of three, not the fourth.
    expect(quotaVerdict({ ...base, used: 3 })).toBe("ok");
    expect(quotaVerdict({ ...base, used: 4 })).toBe("quota-exceeded");
  });

  it("refuses when the request would cross the ceiling", () => {
    expect(quotaVerdict({ ...base, committed: 50_000_000 })).toBe("ok");
    expect(quotaVerdict({ ...base, committed: 50_000_001 })).toBe(
      "ceiling-exceeded",
    );
  });

  it("reports the ceiling first when both are blown", () => {
    // "Ya usaste tus 3 imágenes" would be a lie when the global budget is
    // gone: the user has generations left and next month will not fix it.
    expect(
      quotaVerdict({ ...base, used: 9, committed: 90_000_000 }),
    ).toBe("ceiling-exceeded");
  });

  it("refuses everything at a zero quota or a zero ceiling", () => {
    expect(quotaVerdict({ ...base, quota: 0 })).toBe("quota-exceeded");
    expect(quotaVerdict({ ...base, ceiling: 0 })).toBe("ceiling-exceeded");
  });
});

describe("remainingGenerations", () => {
  it("never goes negative when a limit is lowered", () => {
    expect(remainingGenerations(1, 3)).toBe(2);
    expect(remainingGenerations(5, 3)).toBe(0);
  });
});

describe("the quota module is safe for a client component", () => {
  it("reads no environment variable directly", () => {
    // The screen imports this to say "te quedan 2 de 3". Same rule as
    // babyImage.ts: env comes in as an argument, never as a `process.env` read
    // that could inline a value into the bundle.
    const source = readFileSync(
      join(process.cwd(), "lib", "ai", "quota.ts"),
      "utf8",
    );
    expect(source).not.toContain("process.env");
  });
});
