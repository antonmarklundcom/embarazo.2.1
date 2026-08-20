import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { adminEmails, isAdminEmail } from "./allowlist";
import {
  ADMIN_ACTIONS,
  AUDIT_META_SCHEMAS,
  FORBIDDEN_AUDIT_META_FIELDS,
  parseAuditMeta,
} from "./audit";

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
      [
        "invite_extended",
        "invite_revoked",
        "user_deleted",
        "user_viewed",
        // K20: deciding what the app publishes is an editorial act performed
        // on somebody else's words, so it is audited like any other.
        "question_approved",
        "question_rejected",
      ].sort(),
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

// ---------------------------------------------------------------------------
// `adminAudit.meta` (August 2026 review follow-up)
// ---------------------------------------------------------------------------
//
// `adminAudit` is the one table A5's deletion retains, so a careless payload
// here outlives the user it describes. The shape is now constrained, and — as
// with E1's FORBIDDEN_COMPANION_FIELDS — the constraint is asserted against the
// source rather than against a comment.

describe("audit meta has a declared shape per action", () => {
  it("covers every action, exactly", () => {
    // Same guarantee as A5's TABLE_DISPOSITION: a new action cannot appear
    // without someone deciding what it may record.
    expect(Object.keys(AUDIT_META_SCHEMAS).sort()).toEqual([...ADMIN_ACTIONS].sort());
  });

  it("accepts what the real call sites send", () => {
    expect(parseAuditMeta("invite_revoked", { code: "ABCD234567" })).toEqual({
      code: "ABCD234567",
    });
    expect(
      parseAuditMeta("user_deleted", { counts: { syncRecords: 37, users: 1 } }),
    ).toEqual({ counts: { syncRecords: 37, users: 1 } });
    expect(parseAuditMeta("user_viewed", undefined)).toEqual({});
  });

  it("rejects an extra key rather than storing it", () => {
    expect(() =>
      parseAuditMeta("invite_revoked", { code: "ABCD234567", email: "a@b.com" }),
    ).toThrow(/inválido/);
    expect(() => parseAuditMeta("user_viewed", { week: 24 })).toThrow(/inválido/);
  });

  it("rejects a payload of the wrong type", () => {
    expect(() => parseAuditMeta("user_deleted", { counts: "muchas" })).toThrow();
    expect(() => parseAuditMeta("invite_extended", { code: "X" })).toThrow();
  });

  it("declares no forbidden field in any schema", () => {
    // The panel cannot read health content (A7), so none of these can be
    // populated today. The assertion exists so the next person's mistake is a
    // failing test rather than a permanent row.
    const source = readFileSync(
      join(process.cwd(), "lib", "admin", "audit.ts"),
      "utf8",
    );
    const schemas = source.slice(
      source.indexOf("export const AUDIT_META_SCHEMAS"),
      source.indexOf("export const FORBIDDEN_AUDIT_META_FIELDS"),
    );
    expect(schemas.length).toBeGreaterThan(50);
    for (const field of FORBIDDEN_AUDIT_META_FIELDS) {
      expect(
        new RegExp(`\\b${field}\\s*:`).test(schemas),
        `an audit payload must not carry "${field}"`,
      ).toBe(false);
    }
  });

  it("is enforced by recordAudit, not left to the call sites", () => {
    const source = readFileSync(
      join(process.cwd(), "lib", "server", "admin.ts"),
      "utf8",
    );
    const fn = source.slice(source.indexOf("export async function recordAudit"));
    expect(fn.slice(0, fn.indexOf("\n}"))).toContain("parseAuditMeta");
  });
});
