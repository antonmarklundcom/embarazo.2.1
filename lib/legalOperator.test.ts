import { describe, expect, it } from "vitest";
import { DEFAULT_LEGAL_OPERATOR, legalOperator } from "./legalOperator";

describe("legalOperator", () => {
  it("keeps the current operator when nothing is configured", () => {
    expect(legalOperator({})).toEqual(DEFAULT_LEGAL_OPERATOR);
    expect(legalOperator({ NEXT_PUBLIC_LEGAL_OPERATOR_NAME: "  " })).toEqual(DEFAULT_LEGAL_OPERATOR);
  });

  it("uses a configured Paraguayan operator with its RUC", () => {
    expect(
      legalOperator({
        NEXT_PUBLIC_LEGAL_OPERATOR_NAME: " Mi Empresa EAS ",
        NEXT_PUBLIC_LEGAL_OPERATOR_COUNTRY: "Paraguay",
        NEXT_PUBLIC_LEGAL_OPERATOR_TAX_ID: "RUC 80000000-1",
      }),
    ).toEqual({ name: "Mi Empresa EAS", country: "Paraguay", taxId: "RUC 80000000-1" });
  });

  it("never attaches a country or RUC to the default operator", () => {
    expect(
      legalOperator({ NEXT_PUBLIC_LEGAL_OPERATOR_COUNTRY: "Paraguay", NEXT_PUBLIC_LEGAL_OPERATOR_TAX_ID: "RUC 1-1" }),
    ).toEqual(DEFAULT_LEGAL_OPERATOR);
  });

  it("treats placeholder values as unset", () => {
    expect(legalOperator({ NEXT_PUBLIC_LEGAL_OPERATOR_NAME: "___" })).toEqual(DEFAULT_LEGAL_OPERATOR);
    expect(
      legalOperator({ NEXT_PUBLIC_LEGAL_OPERATOR_NAME: "Mi Empresa EAS", NEXT_PUBLIC_LEGAL_OPERATOR_TAX_ID: "RUC TBD" }),
    ).toEqual({ name: "Mi Empresa EAS", country: null, taxId: null });
  });
});
