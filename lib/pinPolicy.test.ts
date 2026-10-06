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

const BACKUP = readFileSync(join(process.cwd(), "lib", "backup.ts"), "utf8");

const MERGE = readFileSync(
  join(process.cwd(), "lib", "sync", "merge.ts"),
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

  it("still applies because a downloaded backup carries the ciphertext AND the salt", () => {
    // Encrypted note bodies are withheld from sync (merge.ts), so the offline
    // attack surface is not the server — it is the backup file, which holds
    // the ciphertext, the salt and the verifier together. If backups ever stop
    // carrying PIN material, the reasoning in lib/crypto.ts changes with it.
    expect(BACKUP).toContain("exportPinMaterial()");
    expect(MERGE).toContain("payload.noteEncrypted === true");
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

  it("says where the encrypted text goes, and does not claim it syncs", () => {
    // F09: this card said "Se sincronizan cifradas" from K18 (2026-08-20) on,
    // but A3 (2026-08-12) already withheld encrypted bodies from sync. A user
    // reading the old line believed her private notes were backed up. They are
    // on this phone and in the files she downloads, nowhere else.
    // JSX wraps sentences across source lines; compare the words, not the layout.
    const words = pinSection.replace(/\s+/g, " ");
    expect(words).toContain("no se sube al servidor");
    expect(words).toContain("copias de seguridad que");
    expect(words).not.toMatch(/sincronizan cifrad/i);
  });
});
