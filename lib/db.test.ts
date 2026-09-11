import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Dexie from "dexie";

import {
  MiBebeDB,
  PHOTO_BACKUP_STORES,
  db,
  notDeleted,
  softDelete,
  wipeAllData,
} from "./db";
import { SYNCED_STORES } from "./sync/stores";
import {
  CURRENT_VERSION,
  SEEDED_AT,
  VERSIONS,
  schemaAt,
  seedDatabaseAt,
} from "@/test/db/fixtures";

// BUILD-PLAN V3 — the Dexie layer, under `fake-indexeddb`.
//
// `lib/db.ts` is the source of truth for everything this app knows about a
// pregnancy, and it had no unit tests: reaching it meant reaching IndexedDB,
// so its upgrade path was covered only by whatever an e2e run happened to walk
// through. An upgrade path that runs once per user per release, on data they
// cannot get back, is the wrong thing to leave to chance.
//
// What is asserted here is what a *user's phone* does: open a database written
// by an older build and find every row still there, with the shape today's code
// reads. `e2e/backup-restore.spec.ts` covers export/import in a real browser and
// is not duplicated.

describe("upgrading from every version a phone could still be on", () => {
  for (const version of VERSIONS) {
    it(`opens a v${version} database and keeps every row`, async () => {
      await seedDatabaseAt(version);

      const database = new MiBebeDB();
      await database.open();

      expect(database.verno).toBe(CURRENT_VERSION);

      // The row that has existed since v1 and has been through every upgrade.
      const profile = await database.profile.toArray();
      expect(profile).toHaveLength(1);
      expect(profile[0]?.city).toBe("Asunción");

      const journal = await database.journalEntries.toArray();
      expect(journal[0]?.note).toBe("primera eco");
      expect(journal[0]?.week).toBe(12);

      // Stores that did not exist at the seeded version are empty, not missing:
      // the upgrade creates them, and reading one must not throw.
      if (version >= 2) {
        expect(await database.photoEntries.count()).toBe(1);
      } else {
        expect(await database.photoEntries.count()).toBe(0);
      }
      if (version >= 3) expect(await database.cycles.count()).toBe(1);
      if (version >= 4) expect(await database.clinical.count()).toBe(1);
      if (version >= 6) {
        expect(await database.favoriteNames.count()).toBe(1);
        expect(await database.sleepEntries.count()).toBe(1);
      }

      database.close();
    });

    it(`gives every v${version} row a sync identity the current code can read`, async () => {
      await seedDatabaseAt(version);

      const database = new MiBebeDB();
      await database.open();

      for (const store of SYNCED_STORES) {
        for (const row of await database.table(store).toArray()) {
          // `Partial<SyncMeta>` in the types, but after the v5 upgrade these
          // are the fields the sync engine reads on every push. A row that
          // reached today with `uid` undefined is a row that can never be
          // uploaded, and nothing would have told anyone.
          expect(typeof row.uid, `${store}.uid`).toBe("string");
          expect(row.uid.length, `${store}.uid`).toBeGreaterThan(0);
          expect(typeof row.updatedAt, `${store}.updatedAt`).toBe("number");
          expect(row.deletedAt ?? null, `${store}.deletedAt`).toBeNull();
        }
      }

      database.close();
    });
  }

  it("stamps pre-v5 rows dirty, so a first sync uploads them", async () => {
    // A user upgrading has data the server has never seen. Treating it as
    // already-known would silently lose every entry she made before she signed
    // in — the failure with no error message anywhere.
    await seedDatabaseAt(4);

    const database = new MiBebeDB();
    await database.open();

    const profile = await database.profile.toArray();
    expect(profile[0]?.dirty).toBe(1);
    const journal = await database.journalEntries.toArray();
    expect(journal[0]?.dirty).toBe(1);

    database.close();
  });

  it("gives the singleton stores their fixed record id", async () => {
    // Two devices that both onboarded offline have to merge into one record
    // when she signs in, and that only works if both call it `singleton`.
    await seedDatabaseAt(4);

    const database = new MiBebeDB();
    await database.open();

    expect((await database.profile.toArray())[0]?.uid).toBe("singleton");
    expect((await database.pregnancy.toArray())[0]?.uid).toBe("singleton");
    expect((await database.clinical.toArray())[0]?.uid).toBe("singleton");

    database.close();
  });

  it("keys the checklist by its own key, not by a random id", async () => {
    await seedDatabaseAt(4);

    const database = new MiBebeDB();
    await database.open();

    expect((await database.checklistState.toArray())[0]?.uid).toBe(
      "key:bolso-carnet",
    );

    database.close();
  });

  it("backfills a uid for photos without pulling them into sync", async () => {
    // K4/v7: the photo stores gain a cross-device `uid` and an `uploadedAt`
    // marker. `uploadedAt` staying absent is exactly right — nothing has been
    // uploaded, and if she opts in these are the first things to go.
    await seedDatabaseAt(6);

    const database = new MiBebeDB();
    await database.open();

    for (const store of PHOTO_BACKUP_STORES) {
      const rows = await database.table(store).toArray();
      expect(rows.length, store).toBeGreaterThan(0);
      for (const row of rows) {
        expect(typeof row.uid, `${store}.uid`).toBe("string");
        expect(row.uploadedAt, `${store}.uploadedAt`).toBeUndefined();
        // And they are NOT in the sync engine.
        expect(row.dirty, `${store}.dirty`).toBeUndefined();
      }
    }

    database.close();
  });

  it("keeps syncState keyed on \"default\", which is the only key the client asks for", async () => {
    await seedDatabaseAt(5);

    const database = new MiBebeDB();
    await database.open();

    const state = await database.syncState.get("default");
    expect(state?.lastPulledAt).toBe(SEEDED_AT);

    database.close();
  });

  it("leaves the optional profile preferences undefined rather than inventing them", async () => {
    // `locale`, `heroTheme` and `showComparison` are all optional and all
    // arrived after v1. Every reader defaults them; an upgrade that guessed
    // would be an upgrade that changed her language for her.
    await seedDatabaseAt(1);

    const database = new MiBebeDB();
    await database.open();

    const profile = (await database.profile.toArray())[0]!;
    expect(profile.locale).toBeUndefined();
    expect(profile.heroTheme).toBeUndefined();
    expect(profile.showComparison).toBeUndefined();

    database.close();
  });

  it("is idempotent — opening twice changes nothing", async () => {
    await seedDatabaseAt(1);

    const first = new MiBebeDB();
    await first.open();
    const uid = (await first.profile.toArray())[0]?.uid;
    first.close();

    const second = new MiBebeDB();
    await second.open();
    expect((await second.profile.toArray())[0]?.uid).toBe(uid);
    expect(await second.profile.count()).toBe(1);
    second.close();
  });
});

describe("regression — an upgrade step may not read a later version's constants", () => {
  // V3 found this, and it was live.
  //
  // v5's `.upgrade()` iterated `SYNCED_STORES`. v6 added `sleepEntries` and
  // `favoriteNames` to that constant. An upgrade transaction is scoped to its
  // own version's schema, so on a phone still on v1–v4 the v5 step reached for
  // `tx.table("sleepEntries")`, a table that does not exist at v5, threw
  // `NotFoundError`, and took the whole upgrade down with it: the database
  // would not open at all. No data lost, no app either, and nothing on screen
  // to say why.
  //
  // `lib/db.ts` now pins `V5_SYNCED_STORES` and `V7_PHOTO_STORES`. This is the
  // case that fails if either is ever pointed back at a living constant.
  for (const version of [1, 2, 3, 4]) {
    it(`opens a v${version} database rather than throwing NotFoundError`, async () => {
      await seedDatabaseAt(version);

      const database = new MiBebeDB();
      await expect(database.open()).resolves.toBeDefined();
      expect(database.verno).toBe(CURRENT_VERSION);
      expect(await database.profile.count()).toBe(1);

      database.close();
    });
  }

  it("pins the upgrade store lists rather than reading SYNCED_STORES", () => {
    // The behavioural cases above only fail while the chain happens to have a
    // store v5 did not have. This one fails the moment somebody undoes the fix,
    // which is the version that keeps working after a future v8.
    const source = readFileSync(join(process.cwd(), "lib", "db.ts"), "utf8");
    const v5 = source.slice(
      source.indexOf("this.version(5)"),
      source.indexOf("this.version(6)"),
    );
    expect(v5).toContain("for (const store of V5_SYNCED_STORES)");
    expect(v5).not.toContain("for (const store of SYNCED_STORES)");

    // Bounded at the end of the constructor: `registerPhotoHooks` below it
    // iterates `PHOTO_BACKUP_STORES` too, and there that is correct — a hook
    // runs against the live schema, not against a frozen one.
    const v7 = source.slice(
      source.indexOf("this.version(7)"),
      source.indexOf("this.registerSyncHooks()"),
    );
    expect(v7).toContain("for (const store of V7_PHOTO_STORES)");
    expect(v7).not.toContain("for (const store of PHOTO_BACKUP_STORES)");
  });
});

describe("the version chain itself", () => {
  it("is strictly increasing and ends where ARCHITECTURE.md says it does", () => {
    // The chain is append-only (ARCHITECTURE.md §4). A renumbered or edited
    // past version is a migration that runs differently on two phones, and the
    // doc drifting out of step is how nobody notices.
    const source = readFileSync(join(process.cwd(), "lib", "db.ts"), "utf8");
    const declared = [...source.matchAll(/this\.version\((\d+)\)/g)].map((m) =>
      Number(m[1]),
    );

    expect(declared.length).toBeGreaterThan(0);
    for (let i = 1; i < declared.length; i += 1) {
      expect(declared[i], `version ${declared[i]} follows ${declared[i - 1]}`)
        .toBeGreaterThan(declared[i - 1]!);
    }

    const highest = Math.max(...declared);
    expect(highest, "the fixtures cover every declared version").toBe(
      CURRENT_VERSION,
    );

    const architecture = readFileSync(
      join(process.cwd(), "docs", "ARCHITECTURE.md"),
      "utf8",
    );
    const section = architecture.slice(
      architecture.indexOf("### Dexie schema versions"),
    );
    const documented = Math.max(
      ...[...section.slice(0, 900).matchAll(/\bv(\d+)\b/g)].map((m) =>
        Number(m[1]),
      ),
    );
    expect(
      documented,
      `lib/db.ts is at v${highest}; ARCHITECTURE.md §4 documents v${documented}. ` +
        "The section is append-only — add the new version to it in the same PR.",
    ).toBe(highest);
  });

  it("declares a fixture schema for every version in the chain", () => {
    const source = readFileSync(join(process.cwd(), "lib", "db.ts"), "utf8");
    const declared = [...source.matchAll(/this\.version\((\d+)\)/g)].map((m) =>
      Number(m[1]),
    );
    expect(VERSIONS).toEqual(declared);
  });

  it("names every synced store in the current schema", () => {
    for (const store of SYNCED_STORES) {
      expect(schemaAt(CURRENT_VERSION), store).toHaveProperty(store);
    }
  });
});

describe("soft deletion", () => {
  it("stamps deletedAt and moves updatedAt, rather than removing the row", async () => {
    // A hard delete would be undone by the next pull — the classic "I deleted
    // it and it came back" bug. The row has to stay so the deletion can travel.
    const database = db();
    const id = await database.journalEntries.add({
      week: 20,
      createdAt: SEEDED_AT,
      mood: "bien",
    } as never);

    await softDelete("journalEntries", id as number, SEEDED_AT + 5000);

    const row = await database.journalEntries.get(id as number);
    expect(row).toBeDefined();
    expect(row?.deletedAt).toBe(SEEDED_AT + 5000);
    // The hook stamps `updatedAt` on any update that does not set it, which is
    // what makes the deletion win last-write-wins against the original write.
    expect(row?.updatedAt).toBeGreaterThan(0);
    expect(row?.dirty).toBe(1);
  });

  it("filters soft-deleted rows out of a result", () => {
    const rows = [
      { id: 1, deletedAt: null },
      { id: 2, deletedAt: SEEDED_AT },
      { id: 3 },
    ];

    expect(notDeleted(rows).map((r) => r.id)).toEqual([1, 3]);
  });

  it("treats undefined as a live row and an empty result as empty", () => {
    expect(notDeleted(undefined)).toEqual([]);
    expect(notDeleted([{ deletedAt: undefined }])).toHaveLength(1);
  });
});

describe("the write hooks", () => {
  it("stamps a new synced row with uid, updatedAt, deletedAt and dirty", async () => {
    const database = db();
    const id = await database.weightEntries.add({
      date: SEEDED_AT,
      kg: 64,
    } as never);

    const row = await database.weightEntries.get(id as number);
    expect(typeof row?.uid).toBe("string");
    expect(typeof row?.updatedAt).toBe("number");
    expect(row?.deletedAt).toBeNull();
    expect(row?.dirty).toBe(1);
  });

  it("leaves fields the caller set alone, so the sync engine can write dirty: 0", async () => {
    // This is what lets a remote record be applied without a global "I am
    // syncing" flag that an await can get out of step with.
    const database = db();
    const id = await database.weightEntries.add({
      date: SEEDED_AT,
      kg: 64,
      uid: "from-the-server",
      updatedAt: 12345,
      dirty: 0,
    } as never);

    const row = await database.weightEntries.get(id as number);
    expect(row?.uid).toBe("from-the-server");
    expect(row?.updatedAt).toBe(12345);
    expect(row?.dirty).toBe(0);
  });

  it("re-dirties a row on update unless the caller says otherwise", async () => {
    const database = db();
    const id = (await database.weightEntries.add({
      date: SEEDED_AT,
      kg: 64,
      dirty: 0,
      updatedAt: 12345,
    } as never)) as number;

    await database.weightEntries.update(id, { kg: 65 });
    expect((await database.weightEntries.get(id))?.dirty).toBe(1);

    await database.weightEntries.update(id, { kg: 66, dirty: 0 });
    expect((await database.weightEntries.get(id))?.dirty).toBe(0);
  });

  it("gives a photo a uid wherever it is created", async () => {
    // A photo with no `uid` is a photo the backup can never name.
    const database = db();
    const id = (await database.photoEntries.add({
      week: 20,
      createdAt: SEEDED_AT,
    } as never)) as number;

    expect(typeof (await database.photoEntries.get(id))?.uid).toBe("string");
  });
});

describe("borrar todos mis datos", () => {
  it("empties every store", async () => {
    await seedDatabaseAt(CURRENT_VERSION);
    const before = db();
    await before.open();
    expect(await before.profile.count()).toBe(1);

    await wipeAllData();

    const after = db();
    await after.open();
    for (const store of [...SYNCED_STORES, ...PHOTO_BACKUP_STORES]) {
      expect(await after.table(store).count(), store).toBe(0);
    }
    expect(await after.syncState.count()).toBe(0);
    expect(await after.conflicts.count()).toBe(0);
  });

  it("drops the database itself, not just its rows", async () => {
    await seedDatabaseAt(CURRENT_VERSION);
    await db().open();

    await wipeAllData();

    expect(await Dexie.exists("mibebe")).toBe(false);
  });

  it("leaves db() usable — the singleton reopens rather than staying dead", async () => {
    // "Borrar todos mis datos" is not a logout. The app keeps running, and the
    // very next write has to land somewhere.
    await seedDatabaseAt(CURRENT_VERSION);
    const before = db();
    await before.open();

    await wipeAllData();

    const after = db();
    expect(after).not.toBe(before);
    const id = await after.weightEntries.add({
      date: SEEDED_AT,
      kg: 64,
    } as never);
    expect(await after.weightEntries.get(id as number)).toBeDefined();
    expect(after.verno).toBe(CURRENT_VERSION);
  });

  it("is safe to call twice", async () => {
    await wipeAllData();
    await expect(wipeAllData()).resolves.toBeUndefined();
  });
});
