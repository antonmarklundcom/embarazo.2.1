import { describe, expect, it } from "vitest";

import { siteParamsToAnswers } from "./siteParams";

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
});
