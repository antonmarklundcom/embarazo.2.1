import { describe, expect, it } from "vitest";

import {
  CHEERS,
  type Cheer,
  CHEER_IDS,
  cheerById,
  groupCheers,
  isCheerId,
} from "./cheers";

// BUILD-PLAN K2. The one property that has to hold forever: what a companion
// sends is an ID from this list, never words they wrote.

describe("the cheer list", () => {
  it("has unique, url-safe ids", () => {
    expect(new Set(CHEER_IDS).size).toBe(CHEER_IDS.length);
    for (const id of CHEER_IDS) {
      expect(id, id).toMatch(/^[a-z][a-z-]{1,30}$/);
    }
  });

  it("gives every entry something to show and something to press", () => {
    for (const cheer of CHEERS) {
      expect(cheer.emoji.length, cheer.id).toBeGreaterThan(0);
      expect(cheer.text.es.length, cheer.id).toBeGreaterThan(0);
      expect(cheer.buttonLabel.length, cheer.id).toBeGreaterThan(0);
      // Short enough to sit on a home screen without becoming a paragraph.
      expect(cheer.text.es.length, cheer.id).toBeLessThanOrEqual(60);
    }
  });

  it("says something different in each entry", () => {
    // Five buttons that mean the same thing is one button and four taps of
    // hesitation.
    expect(new Set(CHEERS.map((c) => c.text.es)).size).toBe(CHEERS.length);
  });

  it("carries Guaraní only where the phrase is really said in Guaraní", () => {
    // `as const satisfies` keeps each entry's literal type, which means the
    // entries without a Guaraní line genuinely have no `gn` property.
    // Widening here is the point of the assertion, not a workaround.
    const withGuarani = (CHEERS as readonly Cheer[]).filter((c) => c.text.gn);
    expect(withGuarani.length).toBeGreaterThan(0);
    for (const cheer of withGuarani) {
      expect(cheer.text.gn!.trim().length, cheer.id).toBeGreaterThan(0);
      expect(cheer.text.gn, cheer.id).not.toBe(cheer.text.es);
    }
  });
});

describe("isCheerId", () => {
  it("accepts exactly the shipped ids", () => {
    for (const id of CHEER_IDS) expect(isCheerId(id)).toBe(true);
  });

  it("rejects everything else, including anything that looks like prose", () => {
    for (const value of [
      "",
      "fuerza ",
      "FUERZA",
      "te odio",
      "Estoy en el sanatorio, vení",
      null,
      undefined,
      42,
      {},
      ["fuerza"],
    ]) {
      expect(isCheerId(value), JSON.stringify(value)).toBe(false);
    }
  });
});

describe("cheerById", () => {
  it("resolves a shipped id", () => {
    expect(cheerById("fuerza")?.emoji).toBe("💪");
  });

  it("returns null for a retired id rather than inventing a phrase", () => {
    // Somebody else's device sent it before this build shipped. Rendering a
    // generic "alguien te mandó ánimo" would put words in their mouth.
    expect(cheerById("una-que-ya-no-existe")).toBeNull();
  });
});

describe("groupCheers", () => {
  const T = 1_760_000_000_000;

  it("collapses repeats and counts them", () => {
    const grouped = groupCheers([
      { cheerId: "te-quiero", createdAt: T },
      { cheerId: "te-quiero", createdAt: T + 1000 },
      { cheerId: "fuerza", createdAt: T + 500 },
    ]);
    expect(grouped.map((g) => [g.cheer.id, g.count])).toEqual([
      ["te-quiero", 2],
      ["fuerza", 1],
    ]);
  });

  it("orders by the most recent of each kind", () => {
    const grouped = groupCheers([
      { cheerId: "te-quiero", createdAt: T },
      { cheerId: "fuerza", createdAt: T + 9000 },
    ]);
    expect(grouped[0]!.cheer.id).toBe("fuerza");
    expect(grouped[0]!.latestAt).toBe(T + 9000);
  });

  it("drops unknown ids entirely — not even a count", () => {
    const grouped = groupCheers([
      { cheerId: "no-existe", createdAt: T },
      { cheerId: "gracias", createdAt: T },
    ]);
    expect(grouped.map((g) => g.cheer.id)).toEqual(["gracias"]);
  });

  it("returns nothing for nothing", () => {
    expect(groupCheers([])).toEqual([]);
  });
});
