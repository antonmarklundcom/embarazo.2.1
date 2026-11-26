import { describe, expect, it } from "vitest";

import { CONVERSAR_STORAGE_KEY, parseTalked, toggleTalked } from "./conversar";

describe("Para conversar device state", () => {
  it("lives in the mibebe. namespace", () => {
    expect(CONVERSAR_STORAGE_KEY).toBe("mibebe.conversar.talked");
  });

  it("keeps only ids of cards that exist, once each", () => {
    expect(parseTalked(JSON.stringify(["casa-1", "casa-1", "no-existe", 3]))).toEqual(["casa-1"]);
  });

  it("survives empty, broken or wrong-shaped storage", () => {
    expect(parseTalked(null)).toEqual([]);
    expect(parseTalked("{not json")).toEqual([]);
    expect(parseTalked(JSON.stringify({ casa: 1 }))).toEqual([]);
  });

  it("toggles an id on and off", () => {
    expect(toggleTalked([], "casa-1")).toEqual(["casa-1"]);
    expect(toggleTalked(["casa-1", "plata-2"], "casa-1")).toEqual(["plata-2"]);
  });
});
