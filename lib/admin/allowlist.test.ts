import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { adminEmails, isAdminEmail } from "./allowlist";
import { ADMIN_ACTIONS } from "./audit";

// BUILD-PLAN A7. The allowlist tests are ordinary; the source-scan at the
// bottom is the one that carries the task's hardest requirement.

describe("ADMIN_EMAILS allowlist", () => {
  it("has no administrators when unset — the safe default", () => {
    expect(adminEmails({})).toEqual([]);
    expect(adminEmails({ ADMIN_EMAILS: "" })).toEqual([]);
    expect(adminEmails({ ADMIN_EMAILS: "   " })).toEqual([]);
    expect(isAdminEmail("anyone@example.com", {})).toBe(false);
  });

  it("parses a comma-separated list, tolerating whitespace", () => {
    expect(
      adminEmails({ ADMIN_EMAILS: " a@example.com , b@example.com " }),
    ).toEqual(["a@example.com", "b@example.com"]);
  });

  it("matches case-insensitively", () => {
    // Providers are inconsistent about the case they return, and an allowlist
    // that fails to match Founder@Gmail.com looks broken rather than strict.
    const env = { ADMIN_EMAILS: "Founder@Gmail.com" };
    expect(isAdminEmail("founder@gmail.com", env)).toBe(true);
    expect(isAdminEmail("FOUNDER@GMAIL.COM", env)).toBe(true);
  });

  it("ignores entries that are not addresses", () => {
    expect(adminEmails({ ADMIN_EMAILS: "admin,,a@b.com" })).toEqual(["a@b.com"]);
  });

  it("does not match a null, blank or partial address", () => {
    const env = { ADMIN_EMAILS: "founder@example.com" };
    expect(isAdminEmail(null, env)).toBe(false);
    expect(isAdminEmail(undefined, env)).toBe(false);
    expect(isAdminEmail("", env)).toBe(false);
    expect(isAdminEmail("founder@example.com.evil.com", env)).toBe(false);
    expect(isAdminEmail("founder", env)).toBe(false);
  });
});

describe("audited actions", () => {
  it("names every mutating action, so adding one is a decision", () => {
    expect([...ADMIN_ACTIONS].sort()).toEqual(
      ["invite_extended", "invite_revoked", "user_deleted", "user_viewed"].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// The privacy limit, enforced against the source
// ---------------------------------------------------------------------------

function filesUnder(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

describe("the panel cannot render health content (ARCHITECTURE.md §9)", () => {
  // BUILD-PLAN A7's "done when": a test asserts no route returns payload
  // contents. Asserting it against a response body would only cover the routes
  // someone remembered to test; asserting it against the source covers every
  // route in the group, including ones Phase I has not written yet.
  const adminSources = [
    ...filesUnder(join(process.cwd(), "app", "admin")),
    ...filesUnder(join(process.cwd(), "components", "admin")),
    join(process.cwd(), "lib", "server", "admin.ts"),
  ].filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

  /**
   * Comments are stripped before scanning. The rule is about what the code
   * *does*, and prose explaining why it must not read a payload would
   * otherwise trip the check that enforces exactly that.
   */
  function code(file: string): string {
    return readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
  }

  it("finds the admin sources it is meant to be scanning", () => {
    // A scan that silently matches nothing would pass forever.
    expect(adminSources.length).toBeGreaterThanOrEqual(5);
  });

  it("still sees real code after stripping comments", () => {
    // Guards the guard: a broken stripper would empty every file and the
    // assertions below would pass vacuously.
    const stripped = adminSources.map(code).join("");
    expect(stripped).toContain("requireAdmin");
    expect(stripped).toContain("recordAudit");
  });

  it("never reads a synced record's body", () => {
    // `payload` is the column's name today; the others are the shapes a
    // record's contents could come back under if someone selected them
    // another way. Store NAMES are deliberately not on this list — the panel
    // has to say "Registros de síntomas: 37", and naming the store is how it
    // does that. Naming a field inside one is the line.
    const forbidden = [
      "payload",
      "decryptNote",
      ".note",
      "symptoms:",
      "noteEncrypted",
      "mood",
    ];
    for (const file of adminSources) {
      const source = code(file);
      for (const term of forbidden) {
        expect(
          source.includes(term),
          `${file} must not reference "${term}" — the panel shows ` +
            `"37 registros", never what they say (ARCHITECTURE.md §9)`,
        ).toBe(false);
      }
    }
  });
});
