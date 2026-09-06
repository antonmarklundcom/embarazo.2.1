import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  FLAG_CACHE_MS,
  getClientFlags,
  getFlag,
  getFlags,
  invalidateFlagCache,
  isFlagStoreAvailable,
  setFlag,
} from "./flags";
import { defaultFlags } from "@/lib/flags/keys";

// I5/U1 — the store, in the configuration CI actually runs in: no database.
//
// That is not a corner case being humoured. It is local-only mode
// (ARCHITECTURE.md §4.2), the path a user who declines an account takes and
// the path every `npm run build` takes, and the flag store's first obligation
// is that adding it changed nothing about how the app behaves there.

const env = { ...process.env };

beforeEach(() => {
  delete process.env.DATABASE_URL;
  invalidateFlagCache();
});

afterEach(() => {
  process.env = { ...env };
  invalidateFlagCache();
});

describe("with no database configured", () => {
  it("returns every flag at its default", async () => {
    expect(await getFlags()).toEqual(defaultFlags());
    expect(await getFlag("recomendados")).toBe(false);
    expect(await getFlag("ai_baby_paused")).toBe(false);
  });

  it("publishes the client-scope defaults and nothing else", async () => {
    expect(await getClientFlags()).toEqual({ recomendados: false });
  });

  it("reports itself unwritable rather than pretending a write worked", async () => {
    expect(isFlagStoreAvailable()).toBe(false);
    await expect(
      setFlag("recomendados", true, { id: "admin-1" }),
    ).rejects.toThrow(/DATABASE_URL/);
  });

  it("still answers after a write was refused", async () => {
    await setFlag("recomendados", true, { id: "admin-1" }).catch(() => {});
    expect(await getFlags()).toEqual(defaultFlags());
  });
});

describe("the cache", () => {
  it("reuses a read for a minute, which is the toggle's worst-case delay", () => {
    // Pinned because it is a promise made on screen ("puede tardar hasta un
    // minuto") and in the route's `max-age`. The three have to agree.
    expect(FLAG_CACHE_MS).toBe(60_000);

    const route = readFileSync(
      join(process.cwd(), "app", "api", "v1", "flags", "route.ts"),
      "utf8",
    );
    expect(route).toContain(`max-age=${FLAG_CACHE_MS / 1000}`);
  });

  it("is dropped by an explicit invalidation, which every write does", () => {
    const source = readFileSync(join(process.cwd(), "lib", "server", "flags.ts"), "utf8");
    const fn = source.slice(source.indexOf("export async function setFlag"));
    expect(fn.slice(0, fn.indexOf("\n}\n"))).toContain("invalidateFlagCache()");
  });
});

describe("one-directional for money", () => {
  // The rule that makes an admin-session compromise recoverable: this store
  // can pause the AI feature, never start it. `AI_BABY_ENABLED` is the master
  // switch and lives in the environment, where a browser cannot reach it.
  const source = readFileSync(join(process.cwd(), "lib", "server", "flags.ts"), "utf8");

  it("says so in the module header, where the next flag gets added", () => {
    expect(source).toContain("AI_BABY_ENABLED");
    expect(source.slice(0, source.indexOf("export const FLAG_CACHE_MS"))).toMatch(
      /ONE-DIRECTIONAL FOR MONEY/,
    );
  });

  it("never reads or writes the master switch itself", () => {
    // If this module could read `process.env.AI_BABY_ENABLED` it could start
    // deciding the feature is on, which is the thing being ruled out.
    expect(source).not.toMatch(/process\.env\.AI_BABY_ENABLED/);
  });

  it("writes the flag row and the audit row in one transaction", () => {
    // There is no un-audited write path — not a second exported setter, not a
    // direct update anywhere else (asserted over the whole tree in
    // `lib/flags/keys.test.ts`). This is the other half: the pair cannot come
    // apart, so a flag cannot change without the row saying who changed it.
    const fn = source.slice(source.indexOf("export async function setFlag"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("transaction");
    expect(body).toContain("adminAudit");
    expect(body).toContain('parseAuditMeta("flag_changed"');
  });
});
