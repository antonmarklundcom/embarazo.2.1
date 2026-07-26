import { describe, expect, it } from "vitest";
import { isPlaceholderRecord, publishedOnly } from "./gate";
import { getDirectory, getPlacements } from "../wordpress";
import { EVENTS } from "../content";
import { VIDEOS } from "../content";
import placementsData from "./placements.json";

// BUILD-PLAN Z1, narrowed by G1.
//
// The directory, events, videos and articles moved to `content/*.json`, where
// the schema rejects placeholder text and the invented +595 981 000 0xx range
// outright — a bad entry cannot reach the repo, so there is nothing left to
// filter at runtime. Placements are the exception: they are ad inventory
// rather than editorial content, still live in the old seed file, and still
// need the gate until real sponsors exist.

describe("isPlaceholderRecord", () => {
  it("flags the (placeholder) text marker anywhere in the record", () => {
    expect(isPlaceholderRecord({ name: "Sanatorio Santa María (placeholder)" }))
      .toBe(true);
    expect(isPlaceholderRecord({ name: "Ok", address: "Calle X (placeholder)" }))
      .toBe(true);
  });

  it("flags the invented +595 981 000 0xx number range", () => {
    expect(isPlaceholderRecord({ whatsappNumber: "+595981000001" })).toBe(true);
    expect(isPlaceholderRecord({ whatsappNumber: "595981000055" })).toBe(true);
    expect(isPlaceholderRecord({ whatsappNumber: "+595 981 000-042" })).toBe(true);
  });

  it("flags the stand-in youtube id", () => {
    expect(isPlaceholderRecord({ youtubeId: "dQw4w9WgXcQ" })).toBe(true);
  });

  it("walks nested objects and arrays", () => {
    expect(isPlaceholderRecord({ a: { b: ["ok", "x (placeholder)"] } })).toBe(true);
  });

  it("passes a realistic real listing", () => {
    expect(
      isPlaceholderRecord({
        id: "sanatorio-migone",
        name: "Sanatorio Migone Battilana",
        category: "sanatorio",
        department: "capital",
        city: "Asunción",
        address: "Eligio Ayala 1293",
        whatsappNumber: "+595981234567",
        isSponsored: false,
        priority: 10,
      }),
    ).toBe(false);
  });

  it("does not flag numbers that merely start similarly", () => {
    expect(isPlaceholderRecord({ whatsappNumber: "+595981000" })).toBe(false);
    expect(isPlaceholderRecord({ whatsappNumber: "+595981555123" })).toBe(false);
  });
});

describe("publishedOnly", () => {
  it("keeps real entries and drops placeholder ones", () => {
    const items = [{ name: "Real" }, { name: "Fake (placeholder)" }];
    expect(publishedOnly(items)).toEqual([{ name: "Real" }]);
  });
});

describe("placements are still gated", () => {
  it("has invented seed rows", () => {
    expect(placementsData.placements.length).toBeGreaterThan(0);
  });

  it("publishes none of them", async () => {
    await expect(getPlacements()).resolves.toHaveLength(0);
  });
});

describe("no placeholder survives into anything published", () => {
  it("holds for every published collection", async () => {
    const collections: unknown[][] = [
      EVENTS,
      VIDEOS,
      await getDirectory(),
      await getPlacements(),
    ];
    for (const collection of collections) {
      for (const entry of collection) {
        expect(isPlaceholderRecord(entry)).toBe(false);
      }
    }
  });
});
