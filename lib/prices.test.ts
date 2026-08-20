import { describe, it, expect } from "vitest";

import { PRICES, PUBLISHED_PRICES } from "@/lib/seed/prices";
import { CARE_SETTINGS } from "@/lib/onboarding/personalisation";
import {
  CARE_SETTING_LABEL,
  CARE_SETTING_ORDER,
  bandFor,
  bandLabel,
  formatGuaranies,
  openingSetting,
  sourceMonthLabel,
} from "./prices";

describe("the gate", () => {
  it("renders nothing until a reviewer has signed the figures off", () => {
    // A wrong price is not a wrong fact — it is a decision somebody makes. The
    // seed ships with placeholder sources AND no reviewedBy, and either gate
    // alone would hide it; both are applied because they fail differently.
    expect(PRICES.length).toBeGreaterThan(0);
    expect(PUBLISHED_PRICES).toEqual([]);
  });

  it("still parses every entry, so the shape is under test before the data is", () => {
    for (const entry of PRICES) {
      expect(entry.bands.length).toBeGreaterThan(0);
      expect(entry.source.length).toBeGreaterThan(0);
      expect(entry.sourceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("covers all three settings for every procedure", () => {
    // The tool is a comparison. An entry that only prices the privado column
    // is an advertisement for going privado.
    for (const entry of PRICES) {
      for (const setting of CARE_SETTING_ORDER) {
        expect(bandFor(entry, setting), `${entry.id} / ${setting}`).not.toBeNull();
      }
    }
  });
});

describe("bandLabel", () => {
  it("says 'Sin costo', never '₲ 0'", () => {
    // A covered service is not one that costs nothing to provide — it is one
    // she does not pay for. "₲ 0" invites the reading that it is worth
    // nothing, in a country where "gratis" is often assumed to mean "worse".
    expect(bandLabel({ setting: "ips", min: 0, max: 0 })).toBe("Sin costo");
    expect(bandLabel({ setting: "publico", min: 0, max: 0 })).not.toContain("0");
  });

  it("prints a fixed fee once rather than as a range of itself", () => {
    expect(bandLabel({ setting: "privado", min: 150000, max: 150000 })).toBe(
      "₲ 150.000",
    );
  });

  it("prints a real range as a range", () => {
    const label = bandLabel({ setting: "privado", min: 150000, max: 450000 });
    expect(label).toContain("150.000");
    expect(label).toContain("450.000");
    expect(label).toContain("–");
  });
});

describe("formatGuaranies", () => {
  it("groups the way people read, with no decimals", () => {
    expect(formatGuaranies(6000000)).toBe("₲ 6.000.000");
    expect(formatGuaranies(250000)).toBe("₲ 250.000");
  });
});

describe("openingSetting", () => {
  it("opens on what she told onboarding", () => {
    for (const setting of CARE_SETTINGS) {
      expect(openingSetting(setting.key)).toBe(setting.key);
    }
  });

  it("shows everything to somebody who did not say", () => {
    // She is exactly the person the comparison is for. A guess here would
    // hide the two columns she came to compare.
    expect(openingSetting(undefined)).toBeNull();
  });
});

describe("labels", () => {
  it("names every setting the app knows about", () => {
    expect(CARE_SETTING_ORDER.length).toBe(CARE_SETTINGS.length);
    for (const setting of CARE_SETTINGS) {
      expect(CARE_SETTING_LABEL[setting.key]).toBeTruthy();
      expect(CARE_SETTING_ORDER).toContain(setting.key);
    }
  });

  it("dates the figures to the month, not the day", () => {
    // A day implies the figures were checked on that exact date; the month is
    // what a price relevamiento honestly has.
    const label = sourceMonthLabel("2026-08-01");
    expect(label).toContain("2026");
    expect(label).not.toContain("1 de");
  });

  it("shows the raw string rather than 'Invalid Date'", () => {
    expect(sourceMonthLabel("no-es-una-fecha")).toBe("no-es-una-fecha");
  });
});
