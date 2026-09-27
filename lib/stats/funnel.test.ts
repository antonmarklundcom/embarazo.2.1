import { describe, expect, it } from "vitest";

import {
  CHANNELS,
  FunnelEventSchema,
  channelOf,
  landingFromSearch,
  qrSource,
  siteMedium,
  totalsByKey,
  weekStart,
  weeklyFunnel,
} from "./funnel";

// Growth plan items 16–18. The whitelist tests are the point, as they are for
// `contentStats`: the pressure on a funnel counter is always one more field
// "just for segmentation", and each one is a step toward a person.

describe("the POST body is a metric and a key, and no more", () => {
  it("accepts each of the five shapes", () => {
    for (const body of [
      { metric: "arrival", key: "week" },
      { metric: "qr", key: "clinica-sur" },
      { metric: "onboarded", key: "sitio-tool" },
      { metric: "first_tool", key: "total" },
      { metric: "return7", key: "total" },
    ]) {
      expect(FunnelEventSchema.safeParse(body).success, JSON.stringify(body)).toBe(true);
    }
  });

  it("rejects any extra field, identity or not", () => {
    for (const extra of ["userId", "deviceId", "sessionId", "week", "department", "ip"]) {
      const body = { metric: "arrival", key: "week", [extra]: "x" };
      expect(FunnelEventSchema.safeParse(body).success, extra).toBe(false);
    }
  });

  it("rejects keys outside each metric's closed set", () => {
    expect(FunnelEventSchema.safeParse({ metric: "arrival", key: "facebook" }).success).toBe(false);
    expect(FunnelEventSchema.safeParse({ metric: "qr", key: "Clinica Sur" }).success).toBe(false);
    expect(FunnelEventSchema.safeParse({ metric: "qr", key: "a".repeat(41) }).success).toBe(false);
    expect(FunnelEventSchema.safeParse({ metric: "onboarded", key: "sitio-x" }).success).toBe(false);
    expect(FunnelEventSchema.safeParse({ metric: "first_tool", key: "kegel" }).success).toBe(false);
    expect(FunnelEventSchema.safeParse({ metric: "visit", key: "total" }).success).toBe(false);
  });
});

describe("landing URL", () => {
  it("reads the site's medium only when utm_source is the site", () => {
    expect(landingFromSearch("?utm_source=site&utm_medium=week&w=20").medium).toBe("week");
    expect(landingFromSearch("?utm_source=google&utm_medium=week").medium).toBeNull();
    expect(landingFromSearch("?utm_medium=week").medium).toBeNull();
    expect(landingFromSearch("").medium).toBeNull();
  });

  it("counts an unknown medium as `other` rather than dropping the arrival", () => {
    expect(siteMedium("newsletter")).toBe("other");
    expect(siteMedium("TOOL")).toBe("tool");
    expect(siteMedium(null)).toBe("other");
  });

  it("reads ?src= lower-cased, and drops anything outside [a-z0-9-]{1,40}", () => {
    expect(qrSource("clinica-sur")).toBe("clinica-sur");
    expect(qrSource(" Clinica-Sur ")).toBe("clinica-sur");
    expect(qrSource("clínica")).toBeNull();
    expect(qrSource("a b")).toBeNull();
    expect(qrSource("")).toBeNull();
    expect(qrSource("x".repeat(41))).toBeNull();
    expect(qrSource(null)).toBeNull();
  });

  it("picks one channel per install, QR first", () => {
    expect(channelOf(landingFromSearch("?src=hospital-1&utm_source=site&utm_medium=home"))).toBe("qr");
    expect(channelOf(landingFromSearch("?utm_source=site&utm_medium=article"))).toBe("sitio-article");
    expect(channelOf(landingFromSearch("?w=3"))).toBe("directo");
    for (const channel of ["qr", "sitio-article", "directo"]) {
      expect(CHANNELS).toContain(channel);
    }
  });
});

describe("weekly table", () => {
  it("starts weeks on Monday", () => {
    expect(weekStart("2026-09-27")).toBe("2026-09-21"); // a Sunday
    expect(weekStart("2026-09-21")).toBe("2026-09-21"); // a Monday
  });

  it("sums each metric into its week and keeps empty weeks", () => {
    const rows = [
      { metric: "arrival", key: "week", day: "2026-09-22", count: 3 },
      { metric: "arrival", key: "tool", day: "2026-09-27", count: 2 },
      { metric: "onboarded", key: "directo", day: "2026-09-23", count: 4 },
      { metric: "first_tool", key: "total", day: "2026-09-15", count: 1 },
      { metric: "return7", key: "total", day: "2026-09-16", count: 1 },
      { metric: "arrival", key: "week", day: "2025-01-01", count: 99 }, // outside window
    ];
    const table = weeklyFunnel(rows, new Date("2026-09-27T12:00:00Z"), 3);
    expect(table.map((r) => r.week)).toEqual(["2026-09-21", "2026-09-14", "2026-09-07"]);
    expect(table[0]).toMatchObject({ arrivals: 5, onboarded: 4, firstTool: 0 });
    expect(table[1]).toMatchObject({ arrivals: 0, firstTool: 1, return7: 1 });
    expect(table[2]).toMatchObject({ arrivals: 0, onboarded: 0 });
  });

  it("totals one metric by key, largest first", () => {
    const rows = [
      { metric: "qr", key: "b", day: "2026-09-22", count: 1 },
      { metric: "qr", key: "a", day: "2026-09-22", count: 2 },
      { metric: "qr", key: "b", day: "2026-09-23", count: 2 },
      { metric: "arrival", key: "week", day: "2026-09-23", count: 9 },
    ];
    expect(totalsByKey(rows, "qr")).toEqual([
      { key: "b", count: 3 },
      { key: "a", count: 2 },
    ]);
  });
});
