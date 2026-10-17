import { describe, expect, it } from "vitest";

import { inNewWeekWindow, newWeekTitle, offerOutcome, turnoverWeekday } from "./newWeek";

describe("semana nueva", () => {
  it("names the weekday her weeks turn on, from her own date", () => {
    expect(turnoverWeekday(new Date(2026, 6, 1).getTime())).toBe("miércoles");
    expect(turnoverWeekday(new Date(2026, 6, 5).getTime())).toBe("domingo");
  });

  it("shows the card on the turnover day and the two days after", () => {
    expect([0, 1, 2, 3, 6].map(inNewWeekWindow)).toEqual([true, true, true, false, false]);
  });

  it("says 'hoy' only on the day itself", () => {
    expect(newWeekTitle(21, 0)).toBe("¡Hoy empezás la semana 21!");
    expect(newWeekTitle(21, 2)).toBe("Empezaste la semana 21");
  });
});

describe("the offer after she taps it", () => {
  it("done on 'on'; pending (a slow first install) is retryable, not blocked", () => {
    expect(offerOutcome("on")).toBe("done");
    expect(offerOutcome("pending")).toBe("pending");
  });

  it("every other answer stays blocked", () => {
    for (const status of ["denied", "off", "unsupported", "unconfigured"]) {
      expect(offerOutcome(status)).toBe("blocked");
    }
  });
});
