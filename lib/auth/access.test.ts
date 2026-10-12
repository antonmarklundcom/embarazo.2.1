import { describe, expect, it } from "vitest";
import { isPublicAppPath, requiresAccount, safeReturnTo, signInDestination } from "./access";

describe("account-first entry", () => {
  it("requires an account by default; test previews must explicitly opt out", () => {
    expect(requiresAccount({})).toBe(true);
    expect(requiresAccount({ AUTH_REQUIRE_ACCOUNT: "false" })).toBe(false);
  });
  it("keeps emergency and legal content public but protects personal tools", () => {
    for (const path of ["/emergencia", "/privacidad", "/terminos", "/semana/20", "/guias/algo", "/cuenta/olvide", "/borrar-cuenta", "/preguntas"]) expect(isPublicAppPath(path)).toBe(true);
    for (const path of ["/", "/ajustes", "/familia", "/herramientas/resumen", "/planeando/calendario"]) expect(isPublicAppPath(path)).toBe(false);
  });
  it("preserves a chosen tool and attribution through sign-in", () => {
    expect(safeReturnTo("/herramientas/resumen?utm_source=site&utm_medium=article")).toBe("/herramientas/resumen?utm_source=site&utm_medium=article");
  });
  it("rejects external and encoded redirect tricks and API paths", () => {
    for (const path of ["https://evil.example", "//evil.example", "/\\evil.example", "/%2fevil.example", "/api/auth/signout", "/cuenta", "/herramientas\nLocation:evil"]) expect(safeReturnTo(path)).toBe("/");
  });
  it("never passes personal dates through an OAuth URL", () => {
    expect(safeReturnTo("/?fum=2026-08-01&fpp=2027-05-08&utm_source=site#fum=2026-08-01")).toBe("/?utm_source=site");
  });
});

describe("onboarding before tool entry", () => {
  it("uses home for sign-in even when a visitor requested a tool", () => {
    expect(signInDestination("/herramientas/resumen?fum=2026-08-01&utm_source=site")).toBe("/?continue=%2Fherramientas%2Fresumen%3Futm_source%3Dsite");
    expect(signInDestination("//evil.test")).toBe("/");
  });
});