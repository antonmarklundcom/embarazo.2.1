import { describe, expect, it } from "vitest";

import {
  BIRTH_CARD_FROM_WEEK,
  UNDO_BIRTH_DAYS,
  babyAge,
  babyAgeLabel,
  birthDateBounds,
  canUndoBirth,
  isValidBirthDate,
  localDay,
  offersBirthCard,
  parseDateInput,
} from "./age";

// Growth plan item 9 — the age maths behind "Tu bebé tiene…".

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe("babyAge", () => {
  it("counts local days, so a baby born tonight is 0 days old until midnight", () => {
    expect(babyAge(at(2026, 9, 27, 22), at(2026, 9, 27, 23)).days).toBe(0);
    expect(babyAge(at(2026, 9, 27, 22), at(2026, 9, 28, 0)).days).toBe(1);
  });

  it("counts weeks and calendar months", () => {
    const born = at(2026, 1, 15);
    expect(babyAge(born, at(2026, 1, 29))).toMatchObject({ days: 14, weeks: 2, months: 0 });
    expect(babyAge(born, at(2026, 2, 14)).months).toBe(0);
    expect(babyAge(born, at(2026, 2, 15)).months).toBe(1);
    expect(babyAge(born, at(2027, 1, 15)).months).toBe(12);
  });

  it("handles a 31st birthday in shorter months and leap years", () => {
    const born = at(2026, 1, 31);
    expect(babyAge(born, at(2026, 2, 27)).months).toBe(0);
    expect(babyAge(born, at(2026, 2, 28)).months).toBe(1);
    expect(babyAge(born, at(2026, 3, 30)).months).toBe(1);
    expect(babyAge(born, at(2026, 3, 31)).months).toBe(2);
    // Born 31 Dec: 1 month on 31 Jan, 2 months on 29 Feb (the last day) of a leap year.
    expect(babyAge(at(2027, 12, 31), at(2028, 2, 28)).months).toBe(1);
    expect(babyAge(at(2027, 12, 31), at(2028, 2, 29)).months).toBe(2);
  });

  it("never goes negative", () => {
    expect(babyAge(at(2026, 10, 1), at(2026, 9, 1))).toMatchObject({ days: 0, weeks: 0, months: 0 });
  });
});

describe("babyAgeLabel", () => {
  it("says days, then weeks until 8, then months, then years", () => {
    const born = at(2026, 1, 1);
    expect(babyAgeLabel(babyAge(born, at(2026, 1, 1)))).toBe("0 días");
    expect(babyAgeLabel(babyAge(born, at(2026, 1, 2)))).toBe("1 día");
    expect(babyAgeLabel(babyAge(born, at(2026, 1, 8)))).toBe("1 semana");
    expect(babyAgeLabel(babyAge(born, at(2026, 2, 19)))).toBe("7 semanas");
    expect(babyAgeLabel(babyAge(born, at(2026, 2, 26)))).toBe("1 mes");
    expect(babyAgeLabel(babyAge(born, at(2026, 4, 1)))).toBe("3 meses");
    expect(babyAgeLabel(babyAge(born, at(2027, 1, 1)))).toBe("1 año");
  });
});

describe("birth date rules", () => {
  const lmp = at(2026, 1, 1);
  it("accepts from week 22 of this pregnancy up to today", () => {
    const now = at(2026, 9, 27);
    const { min, max } = birthDateBounds(lmp, now);
    expect(min).toBe(localDay(lmp + 22 * 7 * 86_400_000));
    expect(max).toBe(localDay(now));
    expect(isValidBirthDate(now, lmp, now)).toBe(true);
    expect(isValidBirthDate(at(2026, 9, 28), lmp, now)).toBe(false);
    expect(isValidBirthDate(min - 86_400_000, lmp, now)).toBe(false);
    expect(isValidBirthDate(min, lmp, now)).toBe(true);
  });

  it("offers the card from week 37", () => {
    expect(BIRTH_CARD_FROM_WEEK).toBe(37);
  });
});

describe("the Hoy card and the undo", () => {
  it("offers the card from week 37 only while there is no birth date", () => {
    expect(offersBirthCard(36, undefined)).toBe(false);
    expect(offersBirthCard(37, undefined)).toBe(true);
    expect(offersBirthCard(42, undefined)).toBe(true);
    expect(offersBirthCard(38, at(2026, 9, 1))).toBe(false);
    expect(offersBirthCard(undefined, undefined)).toBe(false);
  });

  it("lets a mistaken tap be undone for 30 days", () => {
    const tapped = at(2026, 9, 1);
    expect(canUndoBirth(undefined, tapped)).toBe(false);
    expect(canUndoBirth(tapped, tapped)).toBe(true);
    expect(canUndoBirth(tapped, tapped + (UNDO_BIRTH_DAYS * 86_400_000 - 1))).toBe(true);
    expect(canUndoBirth(tapped, tapped + UNDO_BIRTH_DAYS * 86_400_000)).toBe(false);
  });

  it("reads a date input as local midnight", () => {
    expect(parseDateInput("2026-09-27")).toBe(new Date(2026, 8, 27).getTime());
    expect(parseDateInput("")).toBeNaN();
    expect(parseDateInput("27/09/2026")).toBeNaN();
  });
});
