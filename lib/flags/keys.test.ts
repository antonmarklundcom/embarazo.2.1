import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  CLIENT_FLAG_KEYS,
  FLAG_DEFINITIONS,
  FLAG_KEYS,
  clientScope,
  defaultFlags,
  isFlagKey,
  mergeFlagRows,
} from "./keys";

// I5/U1. The list is pinned for the same reason `ADMIN_ACTIONS` is: a flag is
// a branch in production behaviour that no deploy records, so one appearing
// without anybody noticing is exactly the failure worth a failing test.

describe("the flag vocabulary", () => {
  it("is exactly these keys", () => {
    expect([...FLAG_KEYS]).toEqual(["ai_baby_paused", "recomendados"]);
  });

  it("declares a scope, a default and a description for each", () => {
    for (const key of FLAG_KEYS) {
      const definition = FLAG_DEFINITIONS[key];
      expect(["server", "client"], key).toContain(definition.scope);
      expect(typeof definition.default, key).toBe("boolean");
      expect(definition.description.length, key).toBeGreaterThan(20);
    }
  });

  it("defaults every flag to false — off is the safe direction", () => {
    // The store falls back to these with no database, on a query that threw
    // and before the first fetch resolves on a phone. Every one of those is a
    // moment where the app must do less, not more, and never spend money.
    expect(Object.values(defaultFlags()).every((v) => v === false)).toBe(true);
  });

  it("keeps `ai_baby_paused` server-scope and phrased as a brake", () => {
    // One-directional for money (`lib/server/flags.ts` header): a flag that
    // gates spending must be a stop on top of the env var, never a substitute
    // for it, and its name is half of what makes that readable at call sites.
    expect(FLAG_DEFINITIONS.ai_baby_paused.scope).toBe("server");
    expect(FLAG_KEYS.filter((k) => /_enabled$/.test(k))).toEqual([]);
  });

  it("publishes only client-scope keys", () => {
    expect(CLIENT_FLAG_KEYS).toEqual(["recomendados"]);
    expect(clientScope(defaultFlags())).toEqual({ recomendados: false });
    expect(Object.keys(clientScope(defaultFlags()))).not.toContain(
      "ai_baby_paused",
    );
  });

  it("narrows an untrusted string", () => {
    expect(isFlagKey("recomendados")).toBe(true);
    expect(isFlagKey("toString")).toBe(false);
    expect(isFlagKey("__proto__")).toBe(false);
    expect(isFlagKey(null)).toBe(false);
  });
});

describe("folding stored rows onto the defaults", () => {
  it("takes a stored value over the default", () => {
    expect(mergeFlagRows([{ key: "recomendados", value: true }])).toEqual({
      ai_baby_paused: false,
      recomendados: true,
    });
  });

  it("accepts MySQL's 1/0 for a boolean column", () => {
    expect(mergeFlagRows([{ key: "ai_baby_paused", value: 1 }]).ai_baby_paused).toBe(
      true,
    );
    expect(mergeFlagRows([{ key: "ai_baby_paused", value: 0 }]).ai_baby_paused).toBe(
      false,
    );
  });

  it("ignores a row for a flag that no longer exists", () => {
    // Removing a flag in a deploy leaves its row behind. That must not take
    // the store down with it, and it must not become a key nothing reads.
    const values = mergeFlagRows([
      { key: "video_gallery", value: true },
      { key: "recomendados", value: true },
    ]);
    expect(values).toEqual({ ai_baby_paused: false, recomendados: true });
  });

  it("ignores a null value", () => {
    expect(mergeFlagRows([{ key: "recomendados", value: null }]).recomendados).toBe(
      false,
    );
  });
});

describe("the audit vocabulary knows about flags", () => {
  it("records the key and the value and nothing else", async () => {
    const { parseAuditMeta } = await import("@/lib/admin/audit");
    expect(parseAuditMeta("flag_changed", { key: "recomendados", value: true }))
      .toEqual({ key: "recomendados", value: true });
    expect(() =>
      parseAuditMeta("flag_changed", {
        key: "recomendados",
        value: true,
        email: "a@b.c",
      }),
    ).toThrow();
    expect(() => parseAuditMeta("flag_changed", { key: "recomendados" })).toThrow();
  });
});

describe("no un-audited write path to the flag table", () => {
  // `setFlag` writes the row and the audit row in one transaction. That is
  // only a guarantee if nothing else in the app touches the table, so this
  // asserts it against the source rather than against the comment saying so.
  it("names `appFlags` only in the schema and the store", () => {
    // Tests are excluded: naming the table is how they pin it (the schema
    // export list, the deletion disposition list, this file). The rule is
    // about what ships.
    const allowed = new Set([
      join("lib", "server", "schema.ts"),
      join("lib", "server", "flags.ts"),
      // A5's coverage list has to name every table by construction.
      join("lib", "server", "account.ts"),
    ]);

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry)) continue;
        if (/\.test\.tsx?$/.test(entry)) continue;
        const relative = full.replace(process.cwd() + "/", "");
        if (allowed.has(relative)) continue;
        if (/\bappFlags\b/.test(readFileSync(full, "utf8"))) offenders.push(relative);
      }
    };
    for (const root of ["app", "components", "lib"]) walk(join(process.cwd(), root));

    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
