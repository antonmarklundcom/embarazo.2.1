// BUILD-PLAN U7 — how big the baby is next to the fruit, honestly.
//
// HANDOFF-2026-09-06 §2: "accurate relative sizing — `lib/weeks.ts.lengthCm`
// already exists per week; add a matching real-world size (cm) per
// fruit/vegetable so the baby and the fruit render at proportionally correct
// relative scale on screen, not just as two same-sized icons side by side."
//
// Two same-sized icons is the thing almost every pregnancy app does, and it
// quietly makes the comparison meaningless: a poppy seed and a watermelon are
// drawn identically, so "del tamaño de una semilla de amapola" carries no size
// information at all. Proportional scale is the whole point of the feature.
//
// The tension it creates is real, though, and it is what this module is for. A
// week-4 embryo is 0.1 cm next to a poppy seed at 0.1 cm — fine — but a week-3
// embryo at 0.01 cm against a chía seed at 0.2 cm is a 1:20 ratio, and at any
// box size that renders the baby as a sub-pixel smudge. So there is a floor,
// and when the floor is hit the drawing stops being to scale and SAYS SO. An
// honest caption is better than either an invisible subject or a silent lie.

/** Below this many pixels a subject is not a drawing, it is a speck. */
export const LEGIBILITY_FLOOR_PX = 14;

export interface ScaleInput {
  /** The baby's length this week (`lib/weeks.ts`), or null before it exists. */
  babyCm: number | null | undefined;
  /** The comparison item's longest dimension. */
  itemCm: number | null | undefined;
  /** The height available to the larger of the two. */
  boxPx: number;
  /** Smallest height either subject may render at. */
  floorPx?: number;
}

export interface ScaleResult {
  /** Render height for the baby, in px. Null when there is no measurement. */
  babyPx: number | null;
  /** Render height for the comparison item, in px. Null when unknown. */
  itemPx: number | null;
  /**
   * True when the floor was applied, i.e. the drawing is NOT to scale.
   * The caller must caption it — see `notToScaleCaption`.
   */
  clamped: boolean;
}

/**
 * Render heights for the baby and its comparison item.
 *
 * The larger subject fills `boxPx`; the smaller is drawn at its true fraction
 * of that — until it would fall under the floor, at which point it is clamped
 * and `clamped` is set so the caller can say so out loud.
 *
 * Either measurement may be missing (weeks 1–2 have no embryo; a comparison
 * row can be absent) and the result simply carries a null for that side. It
 * never throws and never divides by zero: this feeds a render, and a hero that
 * crashes because a seed file is short a row is worse than one that shows the
 * baby alone.
 */
export function heroScale({
  babyCm,
  itemCm,
  boxPx,
  floorPx = LEGIBILITY_FLOOR_PX,
}: ScaleInput): ScaleResult {
  const baby = positive(babyCm);
  const item = positive(itemCm);

  if (baby === null && item === null) {
    return { babyPx: null, itemPx: null, clamped: false };
  }
  // Only one subject: it fills the box on its own. Nothing to be to scale with.
  if (baby === null) return { babyPx: null, itemPx: boxPx, clamped: false };
  if (item === null) return { babyPx: boxPx, itemPx: null, clamped: false };

  const largest = Math.max(baby, item);
  const exactBaby = (baby / largest) * boxPx;
  const exactItem = (item / largest) * boxPx;

  const babyPx = Math.max(exactBaby, floorPx);
  const itemPx = Math.max(exactItem, floorPx);

  // Clamped only when the floor actually moved something. A `floorPx` bigger
  // than the box would otherwise report every week as not-to-scale.
  const clamped = exactBaby < floorPx || exactItem < floorPx;

  return {
    babyPx: round(Math.min(babyPx, boxPx)),
    itemPx: round(Math.min(itemPx, boxPx)),
    clamped,
  };
}

/**
 * "tamaño real ≈ 0,1 cm" — what a clamped drawing has to admit.
 *
 * es-PY writes the decimal separator as a comma, and a measurement in a health
 * app that reads as a foreign number is a small thing that says "this was not
 * written for you".
 */
export function notToScaleCaption(babyCm: number | null | undefined): string | null {
  const value = positive(babyCm);
  if (value === null) return null;
  const text = value < 1 ? value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "") : String(value);
  return `tamaño real ≈ ${text.replace(".", ",")} cm`;
}

/**
 * Week 20 is where `lib/weeks.ts` switches from crown-rump to crown-heel.
 *
 * The prompt is explicit that this must not be smoothed: the jump from 16.4 cm
 * to 25.6 cm is not growth, it is a change of ruler, and averaging it away
 * would make every figure after it subtly wrong to hide one honest step. So it
 * is captioned instead, once, on the week it happens.
 */
export const MEASUREMENT_SWITCH_WEEK = 20;

export function measurementNote(week: number): string | null {
  if (week < MEASUREMENT_SWITCH_WEEK) return "de la cabeza a la cola";
  return "de la cabeza a los pies";
}

/** True on the week the ruler changes, where the jump needs explaining. */
export function switchesMeasurementAt(week: number): boolean {
  return week === MEASUREMENT_SWITCH_WEEK;
}

function positive(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
