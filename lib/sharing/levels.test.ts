import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";

import { companionSnapshots } from "@/lib/server/schema";
import { COMPANION_FIELDS } from "./fields";
import {
  FORBIDDEN_SHARED_FIELDS,
  LEVEL_FIELDS,
  SHARED_EXTRA_FIELDS,
  SHARING_DEFAULTS,
  SHARING_LEVELS,
  applyLevels,
  canSeeSharingLevels,
  emptyExtras,
  parsePreferences,
  type SharedExtras,
} from "./levels";

// BUILD-PLAN K3: "each toggle is independently on/off; turning one off removes
// the data from the partner view on next sync; a field not in the whitelist
// shape cannot leak by construction; familia never sees these."

const FULL: SharedExtras = {
  weightGrams: 68_400,
  weightAt: 1_760_000_000_000,
  kickCount: 12,
  kickAt: 1_760_000_100_000,
};

const ALL_ON = { peso: true, pataditas: true, fotos: true };

describe("the default is not sharing", () => {
  it("has every level off", () => {
    for (const level of SHARING_LEVELS) {
      expect(SHARING_DEFAULTS[level], level).toBe(false);
    }
  });

  it("shares nothing under the defaults, even with everything to share", () => {
    expect(applyLevels(SHARING_DEFAULTS, FULL)).toEqual(emptyExtras());
  });
});

describe("a field cannot leak unless a level claims it", () => {
  it("assigns every shared field to exactly one level", () => {
    // This is the "by construction" guarantee. `applyLevels` starts from
    // nothing and copies only what LEVEL_FIELDS names, so a field nobody
    // claimed travels as null forever — and a field claimed twice would make
    // "turn peso off" ambiguous. Both fail here rather than in production.
    const claims = new Map<string, string[]>();
    for (const level of SHARING_LEVELS) {
      for (const field of LEVEL_FIELDS[level]) {
        claims.set(field, [...(claims.get(field) ?? []), level]);
      }
    }
    for (const field of SHARED_EXTRA_FIELDS) {
      expect(claims.get(field), `${field} belongs to no level`).toHaveLength(1);
    }
    expect([...claims.keys()].sort()).toEqual([...SHARED_EXTRA_FIELDS].sort());
  });

  it("emits nothing for a field invented at the call site", () => {
    const sneaky = {
      ...FULL,
      // A caller passing a wider object: applyLevels reads only the names the
      // levels claim, so this never reaches the output.
      note: "me duele la cabeza",
      bloodType: "O-",
    } as unknown as SharedExtras;
    const out = applyLevels(ALL_ON, sneaky);
    expect(Object.keys(out).sort()).toEqual([...SHARED_EXTRA_FIELDS].sort());
  });

  it("never names a field the opt-in tier must not carry", () => {
    for (const field of SHARED_EXTRA_FIELDS) {
      for (const forbidden of FORBIDDEN_SHARED_FIELDS) {
        expect(
          field.toLowerCase().includes(forbidden.toLowerCase()),
          `${field} looks like "${forbidden}"`,
        ).toBe(false);
      }
    }
  });

  it("keeps journal notes out of the vocabulary entirely", () => {
    // Not a level, not a field, not an option. The plan's word is "period".
    expect(SHARING_LEVELS).not.toContain("notas");
    expect(FORBIDDEN_SHARED_FIELDS).toContain("note");
    expect(FORBIDDEN_SHARED_FIELDS).toContain("notes");
  });
});

describe("each level is independent", () => {
  it("shares only weight when only peso is on", () => {
    expect(applyLevels({ ...SHARING_DEFAULTS, peso: true }, FULL)).toEqual({
      weightGrams: 68_400,
      weightAt: FULL.weightAt,
      kickCount: null,
      kickAt: null,
    });
  });

  it("shares only kicks when only pataditas is on", () => {
    expect(applyLevels({ ...SHARING_DEFAULTS, pataditas: true }, FULL)).toEqual({
      weightGrams: null,
      weightAt: null,
      kickCount: 12,
      kickAt: FULL.kickAt,
    });
  });

  it("carries nothing for fotos yet, on or off", () => {
    // K4 is what gives this level something to publish; K3 records the choice.
    expect(applyLevels({ ...SHARING_DEFAULTS, fotos: true }, FULL)).toEqual(
      emptyExtras(),
    );
    expect(LEVEL_FIELDS.fotos).toEqual([]);
  });

  it("removes a value the moment its level goes off", () => {
    const on = applyLevels(ALL_ON, FULL);
    expect(on.weightGrams).toBe(68_400);
    const off = applyLevels({ ...ALL_ON, peso: false }, FULL);
    expect(off.weightGrams).toBeNull();
    expect(off.weightAt).toBeNull();
    // ...and takes nothing else with it.
    expect(off.kickCount).toBe(12);
  });
});

describe("only the pareja", () => {
  it("is partner and nobody else — not even the owner's own family", () => {
    expect(canSeeSharingLevels("partner")).toBe(true);
    expect(canSeeSharingLevels("family")).toBe(false);
    expect(canSeeSharingLevels("owner")).toBe(false);
  });
});

describe("parsePreferences defaults everything unknown to off", () => {
  it("reads a well-formed value", () => {
    expect(parsePreferences({ peso: true, pataditas: false, fotos: true })).toEqual(
      { peso: true, pataditas: false, fotos: true },
    );
  });

  it("treats anything else as not sharing", () => {
    for (const value of [
      undefined,
      null,
      "peso",
      42,
      [],
      {},
      { peso: "true" },
      { peso: 1 },
      { PESO: true },
      { otra: true },
    ]) {
      expect(parsePreferences(value), JSON.stringify(value)).toEqual(
        SHARING_DEFAULTS,
      );
    }
  });

  it("ignores levels it does not know", () => {
    expect(parsePreferences({ peso: true, sintomas: true })).toEqual({
      ...SHARING_DEFAULTS,
      peso: true,
    });
  });
});

describe("the table holds exactly what the whitelists claim", () => {
  it("has no column outside the snapshot, the flags and the level fields", () => {
    // Stronger than a blacklist: a column added without being named in one of
    // the code's own whitelists fails here, whatever it is called. This is the
    // schema half of "the whitelist is a shape, not a filter".
    const columns = Object.values(getTableColumns(companionSnapshots)).map(
      (column) => column.name,
    );
    expect(columns.sort()).toEqual(
      [
        "pregnancyId",
        ...COMPANION_FIELDS,
        "sharePeso",
        "sharePataditas",
        "shareFotos",
        ...SHARED_EXTRA_FIELDS,
      ].sort(),
    );
  });

  it("defaults every sharing flag to false in the column itself", () => {
    // A row written by a client that predates K3 has to mean "not shared".
    const columns = getTableColumns(companionSnapshots);
    expect(columns.sharePeso.default).toBe(false);
    expect(columns.sharePataditas.default).toBe(false);
    expect(columns.shareFotos.default).toBe(false);
  });
});
