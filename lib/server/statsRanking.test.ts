import { describe, expect, it } from "vitest";

import { rankByBucket } from "./stats";
import { POPULAR_LIMIT, weekBucket } from "@/lib/stats/contentStats";

// K5 (§7) — the grouping half of `popularContent`, which is where the product
// decision lives and which should not need a MySQL to check.

const row = (contentId: string, week: number, views: number) => ({
  contentId,
  week,
  views,
});

describe("bucket 0 is everybody, not 'readers with no week'", () => {
  it("counts every row into the fallback as well as its own bucket", () => {
    const ranked = rankByBucket([row("a", 8, 5), row("b", 30, 3)]);
    const everybody = ranked.find((entry) => entry.bucket === 0)!;
    expect(everybody.items.map((item) => item.contentId)).toEqual(["a", "b"]);
    // And each still appears in its own.
    expect(
      ranked.find((entry) => entry.bucket === weekBucket(8))!.items[0]!.contentId,
    ).toBe("a");
    expect(
      ranked.find((entry) => entry.bucket === weekBucket(30))!.items[0]!.contentId,
    ).toBe("b");
  });

  it("is what the client falls back to, so a quiet bucket is simply absent", () => {
    // The alternative — returning a bucket with one row in it — presents one
    // woman's afternoon as what everyone is reading.
    const ranked = rankByBucket([row("a", 8, 5)]);
    expect(ranked.map((entry) => entry.bucket)).toEqual([0, weekBucket(8)]);
    expect(ranked.find((entry) => entry.bucket === weekBucket(30))).toBeUndefined();
  });
});

describe("ranking", () => {
  it("sums a content id across days within a bucket", () => {
    const ranked = rankByBucket([row("a", 8, 2), row("a", 9, 3), row("b", 8, 4)]);
    // 8 and 9 are the same bucket, so a totals 5 and beats b.
    const bucket = ranked.find((entry) => entry.bucket === weekBucket(8))!;
    expect(bucket.items).toEqual([
      { contentId: "a", views: 5 },
      { contentId: "b", views: 4 },
    ]);
  });

  it("caps each bucket at the limit", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(`c${i}`, 8, 10 - i));
    for (const entry of rankByBucket(rows)) {
      expect(entry.items.length).toBeLessThanOrEqual(POPULAR_LIMIT);
    }
  });

  it("breaks ties by id so the payload is stable across requests", () => {
    // The response is cached for ten minutes and shared by everybody. A tie
    // broken by Map order would reshuffle the rail between two readers for no
    // reason either of them could see.
    const first = rankByBucket([row("b", 8, 4), row("a", 8, 4)]);
    const second = rankByBucket([row("a", 8, 4), row("b", 8, 4)]);
    expect(first).toEqual(second);
    expect(first[0]!.items.map((item) => item.contentId)).toEqual(["a", "b"]);
  });

  it("keeps weekless views out of every real bucket", () => {
    // A reader in planeando mode counts towards "everybody" and towards no
    // pregnancy week, which is the honest placement for a view whose week we
    // never learned.
    const ranked = rankByBucket([row("a", 0, 9)]);
    expect(ranked.map((entry) => entry.bucket)).toEqual([0]);
  });
});
