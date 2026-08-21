import { describe, expect, it } from "vitest";

import {
  monthKey,
  monthLabel,
  summariseClicks,
  type ClickRow,
} from "./placementReport";

// FABLE-PLAN K15 — the grouping, checked without a MySQL.

const rows = (...items: [string, string, number][]): ClickRow[] =>
  items.map(([placementId, day, clicks]) => ({ placementId, day, clicks }));

describe("monthKey", () => {
  it("takes the month off a day bucket", () => {
    expect(monthKey("2026-08-21")).toBe("2026-08");
  });

  it("refuses anything that is not a day bucket", () => {
    // A guess here would put somebody else's clicks on a sponsor's invoice.
    for (const bad of ["2026-08", "", "hoy", "2026-8-1", "2026-08-21T10:00"]) {
      expect(monthKey(bad), bad).toBeNull();
    }
  });
});

describe("summariseClicks", () => {
  it("adds a placement's days up into its month", () => {
    const [month] = summariseClicks(
      rows(["plc-001", "2026-08-01", 3], ["plc-001", "2026-08-30", 4]),
    );
    expect(month).toEqual({
      month: "2026-08",
      total: 7,
      items: [{ placementId: "plc-001", clicks: 7 }],
    });
  });

  it("keeps months apart and returns the newest first", () => {
    const months = summariseClicks(
      rows(["plc-001", "2026-07-31", 5], ["plc-001", "2026-08-01", 1]),
    );
    expect(months.map((m) => m.month)).toEqual(["2026-08", "2026-07"]);
    expect(months.map((m) => m.total)).toEqual([1, 5]);
  });

  it("ranks placements within a month, breaking ties by id", () => {
    const [month] = summariseClicks(
      rows(
        ["plc-002", "2026-08-01", 4],
        ["plc-001", "2026-08-01", 4],
        ["dir-san-001", "2026-08-02", 9],
      ),
    );
    expect(month!.items.map((i) => i.placementId)).toEqual([
      "dir-san-001",
      "plc-001",
      "plc-002",
    ]);
  });

  it("counts a directory listing the same as a placement", () => {
    // One route serves both, both are sponsor-facing, and the report would be
    // wrong about a sponsored listing if it silently dropped it.
    const [month] = summariseClicks(rows(["dir-san-001", "2026-08-01", 2]));
    expect(month!.total).toBe(2);
  });

  it("drops rows a malformed day makes unattributable", () => {
    expect(summariseClicks(rows(["plc-001", "no-es-un-dia", 3]))).toEqual([]);
  });

  it("ignores zero and negative counts rather than subtracting them", () => {
    expect(
      summariseClicks(rows(["plc-001", "2026-08-01", 0], ["plc-002", "2026-08-01", -5])),
    ).toEqual([]);
  });

  it("is empty for an empty table — the honest state before launch", () => {
    expect(summariseClicks([])).toEqual([]);
  });
});

describe("monthLabel", () => {
  it("reads as a month in es-PY", () => {
    expect(monthLabel("2026-08").toLowerCase()).toContain("agosto");
    expect(monthLabel("2026-08")).toContain("2026");
  });

  it("does not shift the month across the UTC boundary", () => {
    // Built with Date.UTC and rendered in UTC: a naive `new Date("2026-08-01")`
    // rendered in a UTC-3 server prints "julio".
    expect(monthLabel("2026-01").toLowerCase()).toContain("enero");
    expect(monthLabel("2026-12").toLowerCase()).toContain("diciembre");
  });

  it("gives back what it got when the key is not a month", () => {
    expect(monthLabel("cualquier-cosa")).toBe("cualquier-cosa");
  });
});
