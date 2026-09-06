import { describe, expect, it } from "vitest";

import {
  LEGIBILITY_FLOOR_PX,
  MEASUREMENT_SWITCH_WEEK,
  heroScale,
  measurementNote,
  notToScaleCaption,
  switchesMeasurementAt,
} from "./scale";

// U7. The comparison is only worth drawing if it is to scale — two same-sized
// icons is what every other app does and it makes "del tamaño de una semilla
// de amapola" carry no size information at all.

describe("the larger subject fills the box", () => {
  it("draws equal sizes equally", () => {
    const result = heroScale({ babyCm: 5, itemCm: 5, boxPx: 200 });
    expect(result.babyPx).toBe(200);
    expect(result.itemPx).toBe(200);
    expect(result.clamped).toBe(false);
  });

  it("draws the smaller one at its true fraction", () => {
    // A week-24 baby (30 cm) against a mandioca (40 cm).
    const result = heroScale({ babyCm: 30, itemCm: 40, boxPx: 200 });
    expect(result.itemPx).toBe(200);
    expect(result.babyPx).toBe(150);
    expect(result.clamped).toBe(false);
  });

  it("works when the baby is the larger one", () => {
    const result = heroScale({ babyCm: 40, itemCm: 10, boxPx: 200 });
    expect(result.babyPx).toBe(200);
    expect(result.itemPx).toBe(50);
  });
});

describe("the legibility floor, and the honesty it costs", () => {
  it("clamps a subject that would be a speck, and says so", () => {
    // Week 3: a 0.01 cm embryo against a 0.2 cm chía seed is 1:20. At 200px
    // the baby would render at 10px — under the floor.
    const result = heroScale({ babyCm: 0.01, itemCm: 0.2, boxPx: 200 });
    expect(result.itemPx).toBe(200);
    expect(result.babyPx).toBe(LEGIBILITY_FLOOR_PX);
    expect(result.clamped).toBe(true);
  });

  it("handles a 1000:1 ratio without producing zero", () => {
    const result = heroScale({ babyCm: 0.01, itemCm: 10, boxPx: 200 });
    expect(result.babyPx).toBe(LEGIBILITY_FLOOR_PX);
    expect(result.itemPx).toBe(200);
    expect(result.clamped).toBe(true);
  });

  it("does not claim to be clamped when nothing moved", () => {
    const result = heroScale({ babyCm: 100, itemCm: 100, boxPx: 200 });
    expect(result.clamped).toBe(false);
  });

  it("never draws anything larger than the box", () => {
    // A floor bigger than the box must not push a subject out of its frame.
    const result = heroScale({ babyCm: 1, itemCm: 1, boxPx: 10, floorPx: 40 });
    expect(result.babyPx).toBeLessThanOrEqual(10);
    expect(result.itemPx).toBeLessThanOrEqual(10);
  });
});

describe("a missing measurement is a normal week, not a crash", () => {
  it("draws the item alone before there is an embryo", () => {
    // Weeks 1–2 have no `lengthCm` at all.
    const result = heroScale({ babyCm: undefined, itemCm: 0.2, boxPx: 200 });
    expect(result.babyPx).toBeNull();
    expect(result.itemPx).toBe(200);
    expect(result.clamped).toBe(false);
  });

  it("draws the baby alone when a comparison row is missing", () => {
    const result = heroScale({ babyCm: 30, itemCm: null, boxPx: 200 });
    expect(result.babyPx).toBe(200);
    expect(result.itemPx).toBeNull();
  });

  it("returns nulls rather than dividing by zero", () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = heroScale({ babyCm: bad, itemCm: bad, boxPx: 200 });
      expect(result.babyPx).toBeNull();
      expect(result.itemPx).toBeNull();
    }
  });
});

describe("the caption a clamped drawing owes the reader", () => {
  it("writes the decimal separator the way es-PY does", () => {
    expect(notToScaleCaption(0.1)).toBe("tamaño real ≈ 0,1 cm");
    expect(notToScaleCaption(0.01)).toBe("tamaño real ≈ 0,01 cm");
    expect(notToScaleCaption(30)).toBe("tamaño real ≈ 30 cm");
  });

  it("says nothing when there is no measurement to report", () => {
    expect(notToScaleCaption(undefined)).toBeNull();
    expect(notToScaleCaption(0)).toBeNull();
  });
});

describe("the crown-rump to crown-heel switch is captioned, not smoothed", () => {
  it("names which ruler is in use", () => {
    expect(measurementNote(19)).toBe("de la cabeza a la cola");
    expect(measurementNote(20)).toBe("de la cabeza a los pies");
    expect(measurementNote(40)).toBe("de la cabeza a los pies");
  });

  it("flags the one week where the number jumps for a reason", () => {
    // 16.4 cm → 25.6 cm is a change of ruler, not a week of growth. Averaging
    // it away would make every later figure wrong to hide one honest step.
    expect(switchesMeasurementAt(MEASUREMENT_SWITCH_WEEK)).toBe(true);
    expect(switchesMeasurementAt(MEASUREMENT_SWITCH_WEEK - 1)).toBe(false);
    expect(switchesMeasurementAt(MEASUREMENT_SWITCH_WEEK + 1)).toBe(false);
  });
});
