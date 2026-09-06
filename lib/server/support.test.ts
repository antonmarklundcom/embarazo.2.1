import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { RESTORE_WINDOW_DAYS, deviceHost } from "./support";
import {
  ADMIN_ACTIONS,
  FORBIDDEN_AUDIT_META_FIELDS,
  parseAuditMeta,
} from "@/lib/admin/audit";

// BUILD-PLAN I1 / U6 — the support console's repairs.
//
// The queries themselves need a database and are covered against a real build;
// what is asserted here is the part that is a decision rather than a query, and
// that a future change could quietly undo.

describe("a push endpoint never leaves this module", () => {
  // Anybody holding the endpoint URL can send that phone a notification. It is
  // a bearer secret, so the panel gets the host and nothing else.
  it("reduces an endpoint to its host", () => {
    expect(
      deviceHost("https://fcm.googleapis.com/fcm/send/cXY123:APA91bH-secret"),
    ).toBe("fcm.googleapis.com");
    expect(deviceHost("https://updates.push.services.mozilla.com/wpush/v2/gAAA")).toBe(
      "updates.push.services.mozilla.com",
    );
  });

  it("never returns the secret part, whatever it is handed", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/SECRETTOKEN",
      "not a url at all",
      "",
      "https://host/path?token=SECRETTOKEN",
    ]) {
      expect(deviceHost(endpoint)).not.toContain("SECRETTOKEN");
      expect(deviceHost(endpoint)).not.toContain("/");
    }
  });

  it("answers something printable for a malformed endpoint", () => {
    // Stored endpoints are data we did not write, so the failure lands here
    // rather than as a thrown error on an admin's screen.
    expect(deviceHost("not a url at all")).toBe("desconocido");
  });

  it("is the only way the page can name a device", () => {
    // `devicesOf` drops the endpoint before returning, so a caller cannot
    // render one by accident even if it wanted to.
    const source = readFileSync(join(process.cwd(), "lib", "server", "support.ts"), "utf8");
    const fn = source.slice(source.indexOf("export async function devicesOf"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("deviceHost(row.endpoint)");
    // The returned shape has a host, not an endpoint.
    expect(body).not.toMatch(/endpoint:\s*row\.endpoint/);
  });
});

describe("the console cannot read what it restores", () => {
  it("never names a record body anywhere in the module", () => {
    // The A7 rule, held to by this module the same way `admin.ts` is: it can
    // clear a tombstone, it cannot look at one.
    const source = readFileSync(join(process.cwd(), "lib", "server", "support.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(source).not.toMatch(/\bpayload\b/);
    expect(source).not.toMatch(/\bphotoBlobs\b/);
    expect(source).not.toMatch(/\bcompanionSnapshots\b/);
  });

  it("offers a bounded window, and says it is a display filter", () => {
    // Nothing purges tombstones, so this is about what is useful to look at,
    // not about what is retained.
    expect(RESTORE_WINDOW_DAYS).toBe(30);
  });
});

describe("every repair is audited, and carries ids only", () => {
  it("names the five new actions", () => {
    for (const action of [
      "member_revoked",
      "device_removed",
      "sessions_revoked",
      "resync_forced",
      "record_restored",
    ] as const) {
      expect(ADMIN_ACTIONS).toContain(action);
    }
  });

  it("accepts exactly the meta each one is allowed", () => {
    expect(
      parseAuditMeta("member_revoked", { pregnancyId: "p1", memberUserId: "u2" }),
    ).toEqual({ pregnancyId: "p1", memberUserId: "u2" });
    expect(parseAuditMeta("device_removed", { subscriptionId: "s1" })).toEqual({
      subscriptionId: "s1",
    });
    expect(parseAuditMeta("sessions_revoked", {})).toEqual({});
    expect(parseAuditMeta("resync_forced", {})).toEqual({});
    expect(
      parseAuditMeta("record_restored", { store: "weightEntries", recordId: "w1" }),
    ).toEqual({ store: "weightEntries", recordId: "w1" });
  });

  it("rejects anything else, so a careless payload cannot outlive the user", () => {
    // `adminAudit` is the one table deletion retains (A5), which is why the
    // shapes are strict rather than advisory.
    expect(() =>
      parseAuditMeta("device_removed", { subscriptionId: "s1", endpoint: "https://x" }),
    ).toThrow();
    expect(() => parseAuditMeta("sessions_revoked", { email: "a@b.c" })).toThrow();
    expect(() =>
      parseAuditMeta("record_restored", {
        store: "weightEntries",
        recordId: "w1",
        kg: 61,
      }),
    ).toThrow();
    expect(() => parseAuditMeta("member_revoked", { pregnancyId: "p1" })).toThrow();
  });

  it("carries none of the forbidden fields in its declared shapes", () => {
    const source = readFileSync(join(process.cwd(), "lib", "admin", "audit.ts"), "utf8");
    const schemas = source.slice(
      source.indexOf("export const AUDIT_META_SCHEMAS"),
      source.indexOf("export const FORBIDDEN_AUDIT_META_FIELDS"),
    );
    for (const field of FORBIDDEN_AUDIT_META_FIELDS) {
      expect(
        new RegExp(`\\b${field}\\s*:`).test(schemas),
        `an audit payload must not carry "${field}"`,
      ).toBe(false);
    }
  });
});

describe("revocation is a real end to a session, not a hint", () => {
  const auth = readFileSync(join(process.cwd(), "lib", "server", "auth.ts"), "utf8");

  it("stamps the version into the token at sign-in", () => {
    expect(auth).toContain("token.sessionVersion = await currentSessionVersion");
  });

  it("compares it on every session read", () => {
    // Without this comparison the column is decoration: a JWT keeps resolving
    // to its user until it expires, whatever the database says.
    expect(auth).toMatch(/token\.sessionVersion !== current/);
  });

  it("leaves the session alone when the version cannot be read", () => {
    // A revocation feature that signs the whole userbase out during a database
    // hiccup is worse than one that is late.
    const fn = auth.slice(auth.indexOf("async function currentSessionVersion"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("return null");
    expect(body).toContain("catch");
  });
});
