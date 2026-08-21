import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { NOT_A_COLLECTION, collectionDebt, weekRenderDebt } from "./contentDebt";
import { PUBLISHED_NAMES } from "@/lib/seed/names";
import { PUBLISHED_FOOD } from "@/lib/seed/food";
import { PUBLISHED_PRICES } from "@/lib/seed/prices";
import { PUBLISHED_EVENTS } from "@/lib/seed/events";
import { MAX_WEEK } from "@/lib/pregnancy";

// §5 D4 — the review-debt page, checked against the app it reports on.

const rows = collectionDebt();
const row = (label: string) => rows.find((r) => r.label === label)!;

describe("every seed collection is on the list", () => {
  it("has a row for each lib/seed/*.json, or an explicit exemption", () => {
    // A new content collection that nobody lists is a surface that can go dark
    // without anyone noticing. The failure lands on whoever adds the file,
    // which is the only cheap moment to decide what it means.
    const files = readdirSync(join(process.cwd(), "lib", "seed"))
      .filter((name) => name.endsWith(".json"))
      .filter((name) => !NOT_A_COLLECTION.has(name));
    const listed = new Set(rows.map((r) => r.file.replace("lib/seed/", "")));
    expect([...files].sort().filter((f) => !listed.has(f))).toEqual([]);
  });

  it("reads a non-empty file for every row", () => {
    // Guards the guard: a wrapper-key typo would report every collection as
    // empty, which reads as catastrophic content debt rather than as a bug.
    for (const entry of rows) {
      expect(entry.total, entry.file).toBeGreaterThan(0);
    }
  });

  it("names the screen that goes dark, not just the file", () => {
    for (const entry of rows) {
      expect(entry.surface.length, entry.label).toBeGreaterThan(0);
    }
  });
});

describe("the counts match what users actually see", () => {
  it("agrees with PUBLISHED_NAMES", () => {
    expect(row("Nombres").published).toBe(PUBLISHED_NAMES.length);
  });

  it("agrees with PUBLISHED_FOOD", () => {
    expect(row("¿Puedo comer…?").published).toBe(PUBLISHED_FOOD.length);
  });

  it("agrees with PUBLISHED_PRICES, the double-gated one", () => {
    expect(row("Precios").published).toBe(PUBLISHED_PRICES.length);
  });

  it("agrees with PUBLISHED_EVENTS", () => {
    expect(row("Eventos").published).toBe(PUBLISHED_EVENTS.length);
  });

  it("adds up: published + hidden = total, everywhere", () => {
    for (const entry of rows) {
      expect(
        entry.published + entry.placeholder + entry.unreviewed + entry.both,
        entry.label,
      ).toBe(entry.total);
    }
  });
});

describe("weekly renders", () => {
  it("reports all 42 weeks", () => {
    const debt = weekRenderDebt();
    expect(debt.total).toBe(MAX_WEEK);
    expect(debt.present).toBeGreaterThanOrEqual(0);
    expect(debt.present).toBeLessThanOrEqual(MAX_WEEK);
  });

  it("lists the first missing weeks rather than all of them", () => {
    const debt = weekRenderDebt();
    expect(debt.missingSample.length).toBeLessThanOrEqual(8);
    for (const week of debt.missingSample) {
      expect(week).toBeGreaterThanOrEqual(1);
      expect(week).toBeLessThanOrEqual(MAX_WEEK);
    }
  });
});
