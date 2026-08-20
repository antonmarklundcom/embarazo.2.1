import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MIN_PIN_LENGTH } from "./crypto";

// K18 — "enforce ≥6-digit PIN or say honestly what a 4-digit PIN protects
// against". Both, and this is the half a reviewer can check.
//
// The reason six and not four is not arbitrary, and it is not "longer is
// better". The threat model changed under the feature: when the PIN shipped, an
// encrypted note lived only in this phone's IndexedDB and the attacker was
// somebody holding the handset, guessing through a UI one try at a time. Since
// A3 put `journalEntries` in SYNCED_STORES, the ciphertext is also a row on a
// server — an offline attack surface, where 10 000 candidates is hours of
// compute whatever the PBKDF2 iteration count is.

const AJUSTES = readFileSync(
  join(process.cwd(), "app", "(app)", "ajustes", "AjustesClient.tsx"),
  "utf8",
);

const STORES = readFileSync(
  join(process.cwd(), "lib", "sync", "stores.ts"),
  "utf8",
);

describe("the PIN floor", () => {
  it("is six digits", () => {
    expect(MIN_PIN_LENGTH).toBe(6);
  });

  it("is enforced from the shared constant, not a copied literal", () => {
    // A hard-coded `< 4` next to a constant that says 6 is the shape this bug
    // had in the first place.
    expect(AJUSTES).toContain("pinInput.length < MIN_PIN_LENGTH");
    expect(AJUSTES).not.toMatch(/pinInput\.length < \d/);
  });

  it("still applies to notes that actually sync, which is why it matters", () => {
    // If this ever stops being true, the floor can come back down — and if
    // someone removes it without noticing this, the reasoning above is wrong
    // in a way nothing else would catch.
    expect(STORES).toContain('"journalEntries"');
  });
});

describe("the copy says what it does and does not protect", () => {
  const pinSection = AJUSTES.slice(
    AJUSTES.indexOf("PIN opcional"),
    AJUSTES.indexOf("Tu privacidad"),
  );

  it("says the PIN is not recoverable", () => {
    // The single most important consequence, and it was not stated anywhere.
    expect(pinSection).toContain("no se recuperan");
  });

  it("says why the length is asked for", () => {
    expect(pinSection).toContain("probando todas las combinaciones");
  });

  it("does not claim the notes simply stay on the phone", () => {
    // They sync. The guarantee is that they sync *encrypted*, which is a
    // stronger and more specific promise than the one it replaced.
    expect(pinSection).not.toMatch(/quedan en (tu|este) tel[ée]fono/i);
  });
});
