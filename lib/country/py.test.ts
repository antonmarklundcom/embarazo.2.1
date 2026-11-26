import { describe, expect, it } from "vitest";

import { COUNTRY } from "./index";
import { PY } from "./py";

describe("lib/country — Paraguay", () => {
  it("is the active country", () => {
    expect(COUNTRY).toBe(PY);
  });

  it("has exactly the agreed fields", () => {
    expect(Object.keys(PY).sort()).toEqual(["currency", "locale", "timeZone"]);
    expect(PY).toEqual({ locale: "es-PY", currency: "PYG", timeZone: "America/Asuncion" });
  });

  it("is accepted by Intl as a locale, time zone and currency", () => {
    const date = new Intl.DateTimeFormat(PY.locale, { timeZone: PY.timeZone });
    expect(date.resolvedOptions().timeZone).toBe(PY.timeZone);
    expect(date.format(new Date(0))).toMatch(/\d/);

    const money = new Intl.NumberFormat(PY.locale, { style: "currency", currency: PY.currency });
    expect(money.resolvedOptions().currency).toBe(PY.currency);
    expect(money.format(150000)).toMatch(/\d/);
  });
});
