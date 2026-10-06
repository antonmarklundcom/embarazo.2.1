import { describe, expect, it } from "vitest";

import { isValidIsoDate, siteParamsToAnswers, withoutSiteParams } from "./siteParams";

const NOW = new Date("2026-09-02T00:00:00Z").getTime();

describe("siteParamsToAnswers", () => {
  it("returns null for a URL with none of the site params", () => {
    expect(siteParamsToAnswers("", NOW)).toBeNull();
    expect(siteParamsToAnswers("?codigo=ABCD1234XY", NOW)).toBeNull();
  });

  it("estimates an LMP from a week number", () => {
    const patch = siteParamsToAnswers("?w=20", NOW);
    expect(patch?.method).toBe("lmp");
    // Week 20: 19 completed weeks (133 days) before now.
    expect(patch?.lmp).toBe("2026-04-22");
  });

  it("counts back from HER calendar day, not UTC's, late at night", () => {
    const saved = process.env.TZ;
    process.env.TZ = "America/Asuncion";
    try {
      // 22:00 on 1 September in Asunción is already 2 September in UTC.
      const lateEvening = new Date("2026-09-02T01:00:00Z").getTime();
      expect(siteParamsToAnswers("?w=20", lateEvening)?.lmp).toBe("2026-04-21");
    } finally {
      if (saved === undefined) delete process.env.TZ;
      else process.env.TZ = saved;
    }
  });

  it("ignores an out-of-range or non-numeric week", () => {
    expect(siteParamsToAnswers("?w=99", NOW)).toBeNull();
    expect(siteParamsToAnswers("?w=0", NOW)).toBeNull();
    expect(siteParamsToAnswers("?w=abc", NOW)).toBeNull();
  });

  it("prefills the due-date step from fpp", () => {
    const patch = siteParamsToAnswers("?fpp=2027-02-12", NOW);
    expect(patch).toEqual({ method: "ecografia", dueDateInput: "2027-02-12" });
  });

  it("prefills the LMP step from fum", () => {
    const patch = siteParamsToAnswers("?fum=2026-04-01", NOW);
    expect(patch).toEqual({ method: "lmp", lmp: "2026-04-01" });
  });

  it("ignores a malformed date", () => {
    expect(siteParamsToAnswers("?fpp=not-a-date", NOW)).toBeNull();
    expect(siteParamsToAnswers("?fum=2026-13-40", NOW)).toBeNull();
  });

  it("prefers fpp over fum over w when more than one is present", () => {
    const patch = siteParamsToAnswers("?w=20&fum=2026-04-01&fpp=2027-02-12", NOW);
    expect(patch).toEqual({ method: "ecografia", dueDateInput: "2027-02-12" });
  });

  it("preselects planning mode", () => {
    expect(siteParamsToAnswers("?modo=planeando", NOW)).toEqual({
      mode: "planeando",
    });
  });

  it("combines modo with a date param", () => {
    expect(siteParamsToAnswers("?modo=planeando&fum=2026-04-01", NOW)).toEqual({
      mode: "planeando",
      method: "lmp",
      lmp: "2026-04-01",
    });
  });

  it("ignores an unrecognised modo value", () => {
    expect(siteParamsToAnswers("?modo=embarazada", NOW)).toBeNull();
  });

  it("F12: refuses a day that does not exist instead of rolling it over", () => {
    expect(siteParamsToAnswers("?fum=2026-02-30", NOW)).toBeNull();
    expect(siteParamsToAnswers("?fpp=2027-02-29", NOW)).toBeNull();
    expect(siteParamsToAnswers("?fpp=2026-04-31", NOW)).toBeNull();
    // A real leap day and month ends still pass.
    expect(siteParamsToAnswers("?fpp=2028-02-29", NOW)?.dueDateInput).toBe("2028-02-29");
    expect(siteParamsToAnswers("?fum=2026-01-31", NOW)?.lmp).toBe("2026-01-31");
  });

  it("F12: reads the calculator's date from the fragment, with the method she chose", () => {
    expect(siteParamsToAnswers("", NOW, "#fum=2026-04-01")).toEqual({ method: "lmp", lmp: "2026-04-01" });
    expect(siteParamsToAnswers("", NOW, "#fpp=2027-02-12")).toEqual({
      method: "ecografia",
      dueDateInput: "2027-02-12",
    });
  });

  it("F12: a fragment date is the whole answer, not merged with an old query", () => {
    expect(siteParamsToAnswers("?fpp=2027-02-12&w=20", NOW, "#fum=2026-04-01")).toEqual({
      method: "lmp",
      lmp: "2026-04-01",
    });
    // …and a fragment with no date leaves the query's date in charge.
    expect(siteParamsToAnswers("?fpp=2027-02-12", NOW, "#modo=planeando")).toEqual({
      mode: "planeando",
      method: "ecografia",
      dueDateInput: "2027-02-12",
    });
  });

  it("F12: ignores a fragment that is not the site's", () => {
    expect(siteParamsToAnswers("", NOW, "#seccion")).toBeNull();
    expect(siteParamsToAnswers("", NOW, "#fum=2026-02-30")).toBeNull();
  });
});

describe("isValidIsoDate", () => {
  it("does not depend on the device's time zone", () => {
    const saved = process.env.TZ;
    try {
      for (const tz of ["America/Asuncion", "Pacific/Kiritimati", "Pacific/Pago_Pago", "UTC"]) {
        process.env.TZ = tz;
        expect(isValidIsoDate("2026-10-04")).toBe(true);
        expect(isValidIsoDate("2026-02-29")).toBe(false);
      }
    } finally {
      if (saved === undefined) delete process.env.TZ;
      else process.env.TZ = saved;
    }
  });
});

describe("withoutSiteParams", () => {
  it("drops the site's keys from the query and the fragment, keeping the rest", () => {
    expect(withoutSiteParams("https://app.test/?fpp=2027-02-12&w=20&codigo=AB12")).toBe("/?codigo=AB12");
    expect(withoutSiteParams("https://app.test/#fum=2026-04-01")).toBe("/");
    expect(withoutSiteParams("https://app.test/?ref=site#fum=2026-04-01&modo=planeando")).toBe("/?ref=site");
  });

  it("leaves a URL with nothing of the site's alone", () => {
    expect(withoutSiteParams("https://app.test/?codigo=AB12")).toBeNull();
    expect(withoutSiteParams("https://app.test/#seccion")).toBeNull();
  });
});
