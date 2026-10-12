import { beforeEach, describe, expect, it, vi } from "vitest";

import { db, wipeAllData } from "@/lib/db";
import {
  BACKUP_TABLES,
  BACKUP_VERSION,
  BackupError,
  exportBackup,
  importBackup,
  validateBackup,
} from "@/lib/backup";
import { exportPinMaterial, setPin } from "@/lib/crypto";
import { resetSyncAvailability, syncNow } from "@/lib/sync/client";

// F07 / N1 — the manual backup is the only recovery path a local-only user
// has. These run the real export and import against fake IndexedDB.

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
});

const T = Date.UTC(2026, 8, 1);

function jpeg(seed: number): Blob {
  const bytes = Uint8Array.from({ length: 64 }, (_, i) => (i * seed) % 256);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  return new Blob([bytes], { type: "image/jpeg" });
}

async function populate(): Promise<void> {
  const d = db();
  await d.profile.add({ name: "Dummy", createdAt: T } as never);
  await d.pregnancy.add({ lmpDate: T, createdAt: T } as never);
  await d.journalEntries.add({ week: 12, symptoms: [], note: "hola", createdAt: T } as never);
  await d.kickSessions.add({ startedAt: T, count: 10 } as never);
  await d.contractionEntries.add({ startedAt: T, durationSec: 40, intervalSec: 300 } as never);
  await d.weightEntries.add({ date: T, kg: 61.5 } as never);
  await d.checklistState.add({ key: "bolso.carne", done: true } as never);
  await d.photoEntries.add({ week: 12, blob: jpeg(3), createdAt: T } as never);
  await d.cycles.add({ startDate: T, createdAt: T } as never);
  await d.cycleSettings.add({ cycleLength: 28 } as never);
  await d.carnePhotos.add({ blob: jpeg(5), createdAt: T } as never);
  await d.clinical.add({ bloodType: "O+" } as never);
  await d.sleepEntries.add({ date: T, hours: 7 } as never);
  await d.favoriteNames.add({ name: "Arami", createdAt: T } as never);
}

async function fileOf(blob: Blob, name = "mibebe-backup.json"): Promise<File> {
  return new File([await blob.text()], name, { type: "application/json" });
}

async function counts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const name of BACKUP_TABLES) out[name] = await db().table(name).count();
  return out;
}

describe("the backup store registry", () => {
  it("covers every Dexie table except the sync bookkeeping", () => {
    const all = db()
      .tables.map((t) => t.name)
      .filter((name) => name !== "syncState" && name !== "conflicts")
      .sort();
    expect([...BACKUP_TABLES].sort()).toEqual(all);
  });
});

describe("export → import", () => {
  it("round-trips every store, photos byte for byte, onto a blank device", async () => {
    await populate();
    const before = await counts();
    const photoBytes = new Uint8Array(
      await (await db().photoEntries.toArray())[0]!.blob.arrayBuffer(),
    );
    const file = await fileOf(await exportBackup());

    await wipeAllData();
    await importBackup(file);

    expect(await counts()).toEqual(before);
    for (const n of Object.values(before)) expect(n).toBe(1);
    const restored = (await db().photoEntries.toArray())[0]!;
    expect(restored.blob.type).toBe("image/jpeg");
    expect(new Uint8Array(await restored.blob.arrayBuffer())).toEqual(photoBytes);
    expect((await db().favoriteNames.toArray())[0]!.name).toBe("Arami");
  });

  it("replaces, not merges: a populated device keeps nothing of its own", async () => {
    await populate();
    const file = await fileOf(await exportBackup());
    await db().sleepEntries.add({ date: T + 1, hours: 3 } as never);
    await db().favoriteNames.add({ name: "Yasy", createdAt: T } as never);

    await importBackup(file);

    expect(await db().sleepEntries.count()).toBe(1);
    expect((await db().favoriteNames.toArray()).map((r) => r.name)).toEqual(["Arami"]);
  });

  it("writes v3 with the account link and the PIN material", async () => {
    await populate();
    await setPin("123456");
    await db().syncState.put({ key: "default", lastPulledAt: 99, accountId: "acc-1" });
    const parsed = JSON.parse(await (await exportBackup()).text());
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.account).toBe("acc-1");
    expect(parsed.pin).toEqual(exportPinMaterial());
    expect(parsed.tables.sleepEntries).toHaveLength(1);
    expect(String(parsed.tables.photoEntries[0].blob)).toMatch(/^data:image\/jpeg;base64,/);
  });
});

describe("the account link travels with the data (A6)", () => {
  it("a v3 file restores its account binding and a fresh pull cursor", async () => {
    await populate();
    await db().syncState.put({ key: "default", lastPulledAt: 500, accountId: "acc-1" });
    const file = await fileOf(await exportBackup());
    await db().syncState.put({ key: "default", lastPulledAt: 900, accountId: "acc-2" });

    await importBackup(file);

    const state = await db().syncState.get("default");
    expect(state?.accountId).toBe("acc-1");
    expect(state?.lastPulledAt).toBe(0);
  });

  it("a local-only copy leaves the device unlinked (linked on next sign-in)", async () => {
    await populate();
    const file = await fileOf(await exportBackup());
    await db().syncState.put({ key: "default", lastPulledAt: 900, accountId: "acc-2" });

    await importBackup(file);

    expect(await db().syncState.get("default")).toBeUndefined();
  });

  it("stops the old account's in-flight writer before restoring a different account", async () => {
    resetSyncAvailability();
    vi.stubGlobal("location", { origin: "http://app.test" });
    let started = false;
    let stopped = false;
    vi.stubGlobal("fetch", async (_input: string | URL, init?: RequestInit) => {
      started = true;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => { stopped = true; reject(new DOMException("aborted", "AbortError")); });
      });
    });
    try {
      await db().profile.add({ city: "Account A", createdAt: T });
      await db().syncState.put({ key: "default", lastPulledAt: 0, accountId: "acc-a" });
      const oldWriter = syncNow();
      await vi.waitFor(() => expect(started).toBe(true));
      await importBackup(new File([JSON.stringify({
        app: "mibebe", version: 3, account: "acc-b", tables: { profile: [{ city: "Account B", createdAt: T }] },
      })], "account-b.json"));
      await oldWriter;
      expect(stopped).toBe(true);
      expect((await db().profile.toArray())[0]?.city).toBe("Account B");
      expect((await db().syncState.get("default"))?.accountId).toBe("acc-b");
    } finally {
      vi.unstubAllGlobals();
      resetSyncAvailability();
    }
  });
});

describe("older and incompatible files", () => {
  it("accepts a v2 file without the newer stores, and clears them", async () => {
    await populate();
    const parsed = JSON.parse(await (await exportBackup()).text());
    parsed.version = 2;
    delete parsed.account;
    delete parsed.tables.sleepEntries;
    delete parsed.tables.favoriteNames;
    const file = new File([JSON.stringify(parsed)], "v2.json");

    await importBackup(file);

    expect(await db().profile.count()).toBe(1);
    expect(await db().sleepEntries.count()).toBe(0);
    expect(await db().favoriteNames.count()).toBe(0);
  });

  it.each([
    ["not JSON", "{oops"],
    ["another app", JSON.stringify({ app: "other", version: 2, tables: {} })],
    ["a newer version", JSON.stringify({ app: "mibebe", version: BACKUP_VERSION + 1, tables: {} })],
    ["a table that is not an array", JSON.stringify({ app: "mibebe", version: 2, tables: { profile: {} } })],
    [
      "a photo that is a remote URL",
      JSON.stringify({
        app: "mibebe",
        version: 2,
        tables: { photoEntries: [{ week: 1, createdAt: T, blob: "https://example.test/x.jpg" }] },
      }),
    ],
    [
      "a photo that is not an image",
      JSON.stringify({
        app: "mibebe",
        version: 2,
        tables: { carnePhotos: [{ createdAt: T, blob: `data:text/html;base64,${btoa("<b>")}` }] },
      }),
    ],
  ])("refuses %s and leaves the device untouched", async (_label, text) => {
    await populate();
    const before = await counts();
    await expect(importBackup(new File([text], "bad.json"))).rejects.toBeInstanceOf(BackupError);
    expect(await counts()).toEqual(before);
  });

  it("names the newer-version problem instead of blaming the file", () => {
    expect(() =>
      validateBackup({ app: "mibebe", version: BACKUP_VERSION + 1, tables: {} }),
    ).toThrow(/versión más nueva/);
  });
});


describe("restore keeps the original data when PIN storage refuses a write", () => {
  for (const failingKey of ["mibebe.pin.salt", "mibebe.pin.verifier"]) {
    it("rolls back a failure on " + failingKey, async () => {
      await setPin("123456");
      await db().profile.add({ city: "Original", createdAt: 1 });
      const originalPin = exportPinMaterial();
      const backup = JSON.parse(await (await exportBackup()).text());
      backup.tables.profile[0].city = "Replacement";
      // Different valid PIN material guarantees both storage writes are tried.
      await setPin("654321");
      backup.pin = exportPinMaterial();
      const { importPinMaterial, unlock } = await import("@/lib/crypto");
      importPinMaterial(originalPin);
      const storage = localStorage;
      const originalSet = storage.setItem.bind(storage);
      let failOnce = true;
      vi.spyOn(storage, "setItem").mockImplementation((key, value) => {
        if (key === failingKey && failOnce) { failOnce = false; throw new DOMException("Storage full", "QuotaExceededError"); }
        originalSet(key, value);
      });
      await expect(importBackup(new File([JSON.stringify(backup)], "backup.json"))).rejects.toThrow();
      expect((await db().profile.toArray())[0]?.city).toBe("Original");
      expect(exportPinMaterial()).toEqual(originalPin);
      expect(await unlock("123456")).toBe(true);
      expect(await unlock("654321")).toBe(false);
      vi.restoreAllMocks();
    });
  }
});
