import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  VERIFIED_KEY, bindVerifiedDeviceAccount, clearOfflineAccess, completeHandoff,
  mayUseOfflineRecords, readHandoff, rememberHandoff, rememberVerifiedAccount,
} from "@/lib/auth/access.client";
import { purgePrivateCaches } from "@/lib/sw/privateCaches";

let values: Map<string, string>;
const handoffKey = "mibebe.auth.handoff.v1";

beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal("location", { pathname: "/", search: "", hash: "", replace: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("account-bound local entry", () => {
  it("binds the first verified account without resetting an existing sync cursor", async () => {
    await db().syncState.put({ key: "default", lastPulledAt: 77, lastSyncAt: 3 });
    expect(await bindVerifiedDeviceAccount("owner")).toBe(true);
    expect(await db().syncState.get("default")).toMatchObject({ accountId: "owner", lastPulledAt: 77, lastSyncAt: 3 });
  });
  it("refuses another account and preserves the original records and owner", async () => {
    await db().profile.add({ city: "Areguá", createdAt: 1 });
    await db().syncState.put({ key: "default", lastPulledAt: 77, accountId: "owner" });
    expect(await bindVerifiedDeviceAccount("other")).toBe(false);
    expect((await db().syncState.get("default"))?.accountId).toBe("owner");
    expect((await db().profile.toArray())[0]?.city).toBe("Areguá");
  });
  it("serializes simultaneous first-entry attempts instead of overwriting an owner", async () => {
    const results = await Promise.all([bindVerifiedDeviceAccount("one"), bindVerifiedDeviceAccount("two")]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(["one", "two"]).toContain((await db().syncState.get("default"))?.accountId);
  });
  it("allows recent offline access only after local records were bound to the verified account", async () => {
    rememberVerifiedAccount("owner");
    expect(await mayUseOfflineRecords()).toBe(false);
    await bindVerifiedDeviceAccount("owner");
    expect(await mayUseOfflineRecords()).toBe(true);
    rememberVerifiedAccount("other");
    expect(await mayUseOfflineRecords()).toBe(false);
  });
  it("rejects stale, future, malformed and signed-out offline grants", async () => {
    await bindVerifiedDeviceAccount("owner");
    for (const at of [Date.now() - 8 * 86400000, Date.now() + 60000, "today", null]) {
      values.set(VERIFIED_KEY, JSON.stringify({ accountId: "owner", at }));
      expect(await mayUseOfflineRecords()).toBe(false);
    }
    rememberVerifiedAccount("owner");
    clearOfflineAccess();
    expect(await mayUseOfflineRecords()).toBe(false);
  });
  it("revokes offline access and private handoff on sign-out even without Cache API", async () => {
    await bindVerifiedDeviceAccount("owner");
    rememberVerifiedAccount("owner");
    rememberHandoff("/herramientas/resumen");
    await purgePrivateCaches();
    expect(await mayUseOfflineRecords()).toBe(false);
    expect(readHandoff()).toBeNull();
  });
});

describe("calculator handoff through login", () => {
  it("keeps dates locally while the redirect contains only the chosen tool and attribution", () => {
    vi.stubGlobal("location", { pathname: "/herramientas/resumen", search: "?utm_source=site", hash: "#fum=2026-08-01" });
    expect(rememberHandoff()).toBe("/herramientas/resumen?utm_source=site");
    expect(readHandoff()).toEqual({ patch: { method: "lmp", lmp: "2026-08-01" }, returnTo: "/herramientas/resumen?utm_source=site" });
    vi.stubGlobal("location", { pathname: "/", search: "", hash: "" });
    rememberHandoff("/herramientas/resumen?utm_source=site");
    expect(readHandoff()?.patch).toEqual({ method: "lmp", lmp: "2026-08-01" });
  });
  it("validates persisted handoff fields and cannot skip onboarding using malformed storage", () => {
    values.set(handoffKey, JSON.stringify({ at: Date.now(), returnTo: "//evil.test", patch: { step: "avisos", profileSaved: true, role: "mama", method: "lmp", lmp: "2026-02-30" } }));
    expect(readHandoff()).toEqual({ patch: null, returnTo: "/" });
    for (const raw of ["oops", "null", JSON.stringify({ at: Date.now() + 60000 }), JSON.stringify({ at: Date.now() - 7200000 })]) {
      values.set(handoffKey, raw);
      expect(readHandoff()).toBeNull();
    }
  });
  it("finishes a tool handoff once and does not redirect again after reload", () => {
    const replace = vi.fn();
    vi.stubGlobal("location", { pathname: "/", search: "", hash: "", replace });
    rememberHandoff("/herramientas/resumen");
    expect(completeHandoff()).toBe(true);
    expect(replace).toHaveBeenCalledWith("/herramientas/resumen");
    expect(completeHandoff()).toBe(false);
  });
});
