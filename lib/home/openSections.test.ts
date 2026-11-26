import { afterEach, describe, expect, it, vi } from "vitest";

import {
  HOME_SECTION_IDS,
  homeSectionHref,
  isHomeSectionOpen,
  resetHomeSections,
  sectionFromHash,
  setHomeSectionOpen,
  subscribeHomeSections,
  takePendingScroll,
  withoutSectionParam,
} from "./openSections";

afterEach(() => resetHomeSections());

describe("Hoy's open rows (memory only)", () => {
  it("starts with every row closed", () => {
    for (const id of HOME_SECTION_IDS) expect(isHomeSectionOpen(id)).toBe(false);
  });

  it("remembers a row until it is closed, and tells subscribers only on change", () => {
    const listener = vi.fn();
    const stop = subscribeHomeSections(listener);
    setHomeSectionOpen("herramientas", true);
    setHomeSectionOpen("herramientas", true);
    expect(isHomeSectionOpen("herramientas")).toBe(true);
    expect(isHomeSectionOpen("tu-semana")).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    setHomeSectionOpen("herramientas", false);
    expect(isHomeSectionOpen("herramientas")).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    setHomeSectionOpen("mas", true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("#abrir= links into Hoy", () => {
  it("a tap never asks for a scroll", () => {
    setHomeSectionOpen("tu-semana", true);
    expect(takePendingScroll("tu-semana")).toBe(false);
  });

  it("builds a fragment link, never a query (the offline copy of / is matched without one)", () => {
    expect(homeSectionHref("tu-semana")).toBe("/#abrir=tu-semana");
  });

  it("reads a known row and ignores anything else", () => {
    expect(sectionFromHash("#abrir=acompanada")).toBe("acompanada");
    expect(sectionFromHash("#w=20&abrir=mas")).toBe("mas");
    expect(sectionFromHash("#abrir=nope")).toBeNull();
    expect(sectionFromHash("")).toBeNull();
  });

  it("removes only its own key from the URL", () => {
    expect(withoutSectionParam("https://app.example.test/#abrir=tu-semana")).toBe("/");
    expect(withoutSectionParam("https://app.example.test/?codigo=AB12#w=20&abrir=mas")).toBe(
      "/?codigo=AB12#w=20",
    );
    expect(withoutSectionParam("https://app.example.test/#w=20")).toBeNull();
  });
});
