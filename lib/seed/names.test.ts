import { describe, expect, it } from "vitest";

import { PUBLISHED_NAMES, filterNames, fold } from "./names";
import { SYNCED_STORES, NATURAL_KEY_FIELDS } from "../sync/stores";

// BUILD-PLAN D2. The Guaraní names are the reason this tool exists, so the
// tests are about them being present, meaningful and findable on a phone
// keyboard — not about the filter mechanics alone.

describe("the catalogue", () => {
  it("carries a real Guaraní section, not a token one", () => {
    const guarani = PUBLISHED_NAMES.filter((entry) => entry.origin === "guarani");
    expect(guarani.length).toBeGreaterThanOrEqual(15);
    expect(guarani.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["Arami", "Yvoty", "Panambi", "Ñasaindy"]),
    );
  });

  it("explains every name", () => {
    // A name list without meanings is a phone book. The meaning is the reason
    // somebody screenshots this screen.
    for (const entry of PUBLISHED_NAMES) {
      expect(entry.meaning.length, entry.name).toBeGreaterThan(3);
    }
  });

  it("has no duplicates", () => {
    const names = PUBLISHED_NAMES.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("finding a name on a phone keyboard", () => {
  it("ignores accents and case", () => {
    // Nobody types "Ñasaindy" with the tilde, or "Aramí" with the accent.
    expect(fold("Ñasaindy")).toBe("nasaindy");
    expect(filterNames(PUBLISHED_NAMES, { query: "nasaindy" })).toHaveLength(1);
    expect(filterNames(PUBLISHED_NAMES, { query: "arami" }).length).toBeGreaterThan(0);
  });

  it("searches the meaning too", () => {
    // Somebody usually knows what they want a name to mean before they know
    // how it is spelled in Guaraní.
    const luna = filterNames(PUBLISHED_NAMES, { query: "luna" }).map((n) => n.name);
    expect(luna).toContain("Yasy");
    const flor = filterNames(PUBLISHED_NAMES, { query: "flor" }).map((n) => n.name);
    expect(flor).toContain("Yvoty");
  });

  it("combines the filters", () => {
    const result = filterNames(PUBLISHED_NAMES, { origin: "guarani", gender: "f" });
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.origin).toBe("guarani");
      expect(entry.gender).toBe("f");
    }
  });

  it("treats 'todos' as no filter at all", () => {
    expect(filterNames(PUBLISHED_NAMES, { origin: "todos", gender: "todos" })).toHaveLength(
      PUBLISHED_NAMES.length,
    );
  });

  it("returns nothing rather than everything for a miss", () => {
    expect(filterNames(PUBLISHED_NAMES, { query: "zzzz" })).toEqual([]);
  });
});

describe("favourites survive a new phone", () => {
  it("is a synced store keyed by the name itself", () => {
    // Keyed by name, not by id: favouriting "Arami" on the phone and on the
    // tablet has to be one record, or a re-sync gives back the same name twice.
    expect(SYNCED_STORES).toContain("favoriteNames");
    expect(NATURAL_KEY_FIELDS.favoriteNames).toBe("name");
  });
});
