import { describe, expect, it } from "vitest";
import {
  BENEFITS,
  MATERNITY_LEAVE_DAYS,
  benefitsByPhase,
  benefitsFor,
  computeLeavePlan,
} from "./derechos";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

describe("computeLeavePlan", () => {
  const dueDate = Date.UTC(2026, 8, 15); // 15 sep 2026

  it("starts at most 2 weeks before the due date (Ley 5508)", () => {
    const plan = computeLeavePlan(dueDate);
    expect(plan.earliestStart).toBe(dueDate - 14 * MS_PER_DAY);
  });

  it("spans exactly 126 days (18 weeks)", () => {
    const plan = computeLeavePlan(dueDate);
    expect((plan.end - plan.earliestStart) / MS_PER_DAY).toBe(
      MATERNITY_LEAVE_DAYS,
    );
  });

  it("makes the IPS reposo available from week 38 (due date − 21 days)", () => {
    const plan = computeLeavePlan(dueDate);
    expect(plan.reposoAvailableFrom).toBe(dueDate - 21 * MS_PER_DAY);
    expect(plan.reposoAvailableFrom).toBeLessThan(plan.earliestStart);
  });
});

describe("benefits catalog", () => {
  it("has unique ids", () => {
    const ids = BENEFITS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every benefit applies to at least one situation", () => {
    for (const b of BENEFITS) {
      expect(b.appliesTo.length).toBeGreaterThan(0);
    }
  });

  it("IPS subsidy is only offered to IPS contributors", () => {
    expect(benefitsFor("ips").some((b) => b.id === "subsidio-ips")).toBe(true);
    expect(benefitsFor("sin-ips").some((b) => b.id === "subsidio-ips")).toBe(false);
    expect(benefitsFor("no-trabaja").some((b) => b.id === "subsidio-ips")).toBe(false);
  });

  it("free public care applies to everyone", () => {
    for (const situation of ["ips", "sin-ips", "no-trabaja"] as const) {
      expect(
        benefitsFor(situation).some((b) => b.id === "parto-gratuito"),
      ).toBe(true);
    }
  });

  it("Tekoporã is not shown to formally insured workers", () => {
    expect(benefitsFor("ips").some((b) => b.id === "tekopora")).toBe(false);
    expect(benefitsFor("no-trabaja").some((b) => b.id === "tekopora")).toBe(true);
  });

  it("groups by phase without losing items", () => {
    for (const situation of ["ips", "sin-ips", "no-trabaja"] as const) {
      const grouped = benefitsByPhase(situation);
      const total = grouped.reduce((n, g) => n + g.items.length, 0);
      expect(total).toBe(benefitsFor(situation).length);
      for (const g of grouped) {
        expect(g.items.length).toBeGreaterThan(0);
      }
    }
  });
});
