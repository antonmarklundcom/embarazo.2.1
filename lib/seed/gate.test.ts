import { describe, expect, it } from "vitest";
import { isPlaceholderRecord, isUnreviewed, publishedOnly, reviewedOnly } from "./gate";
import { EVENTS, PUBLISHED_EVENTS } from "./events";
import { VIDEOS, PUBLISHED_VIDEOS } from "./videos";
import { getDirectory, getPlacements } from "../wordpress";
import directoryData from "./directory.json";
import placementsData from "./placements.json";

// BUILD-PLAN Z1. These tests are the guard rail: they fail the build if any
// invented business, sponsor, event or video can reach a user. When real data
// replaces the seeds, the "nothing is published" assertions below are expected
// to be updated — the "no placeholder survives" ones never are.

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
        id: "dir-001",
        name: "Sanatorio Migone Battilana",
        category: "sanatorio",
        department: "capital",
        city: "Asunción",
        address: "Eligio Ayala 1293",
        whatsappNumber: "+595981234567",
        mapsUrl: "https://maps.google.com/?q=Sanatorio+Migone",
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

describe("seed gating (current state: everything is placeholder)", () => {
  it("publishes no invented events", () => {
    expect(EVENTS.length).toBeGreaterThan(0);
    expect(PUBLISHED_EVENTS).toHaveLength(0);
  });

  it("publishes no invented videos", () => {
    expect(VIDEOS.length).toBeGreaterThan(0);
    expect(PUBLISHED_VIDEOS).toHaveLength(0);
  });

  it("publishes no invented directory listings", async () => {
    expect(directoryData.listings.length).toBeGreaterThan(0);
    await expect(getDirectory()).resolves.toHaveLength(0);
  });

  it("publishes no invented placements", async () => {
    expect(placementsData.placements.length).toBeGreaterThan(0);
    await expect(getPlacements()).resolves.toHaveLength(0);
  });
});

describe("isUnreviewed / reviewedOnly (D3 review gate)", () => {
  it("flags an entry with no reviewedBy at all", () => {
    expect(isUnreviewed({})).toBe(true);
  });

  it("flags an entry with an empty/blank reviewedBy", () => {
    expect(isUnreviewed({ reviewedBy: "" })).toBe(true);
    expect(isUnreviewed({ reviewedBy: "   " })).toBe(true);
  });

  it("passes an entry with a real reviewedBy", () => {
    expect(isUnreviewed({ reviewedBy: "Dra. Pérez" })).toBe(false);
  });

  it("drops unreviewed entries and keeps reviewed ones", () => {
    const items = [{ id: "a" }, { id: "b", reviewedBy: "Dra. Pérez" }];
    expect(reviewedOnly(items)).toEqual([{ id: "b", reviewedBy: "Dra. Pérez" }]);
  });
});

describe("no placeholder survives any gate", () => {
  it("holds for every published collection", async () => {
    const collections = [
      PUBLISHED_EVENTS,
      PUBLISHED_VIDEOS,
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
