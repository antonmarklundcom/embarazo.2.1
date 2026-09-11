import Dexie from "dexie";

import {
  SYNCED_STORES,
  isSyncedStore,
  recordIdFor,
} from "@/lib/sync/stores";

// V3 — a populated `mibebe` database at any past schema version.
//
// **Fixture format** (four lines, so a later version is four lines of work):
//   1. Add the version's cumulative `stores` object to `SCHEMAS` — exactly the
//      stores a device running that release had, copied from the matching
//      `this.version(n).stores({...})` in `lib/db.ts` and merged with the one
//      before it.
//   2. Add the rows that version could hold to `SEED`, keyed by store. Plain
//      JSON — no `uid`, no `updatedAt`, no `dirty` before v5, because a device
//      on that version did not have them.
//   3. `openAt(n)` then writes them through a Dexie pinned to version `n`.
//   4. `lib/db.test.ts` picks both up automatically; it iterates `VERSIONS`.
//
// Written through Dexie rather than stored as an IndexedDB dump on purpose: a
// dump is a binary blob nobody can review, and it would encode one browser's
// idea of the format. This encodes the *schema*, which is the thing the upgrade
// path actually reads.

/** Cumulative stores at each version, as `lib/db.ts` declared them. */
export const SCHEMAS: Record<number, Record<string, string>> = {
  1: {
    profile: "++id",
    pregnancy: "++id",
    journalEntries: "++id, week, createdAt",
    kickSessions: "++id, startedAt",
    contractionEntries: "++id, startedAt",
    weightEntries: "++id, date",
    checklistState: "++id, &key",
  },
  2: {
    photoEntries: "++id, week, createdAt",
  },
  3: {
    cycles: "++id, startDate, createdAt",
    cycleSettings: "++id",
  },
  4: {
    carnePhotos: "++id, createdAt",
    clinical: "++id",
  },
  5: {
    profile: "++id, &uid, updatedAt, dirty",
    pregnancy: "++id, &uid, updatedAt, dirty",
    journalEntries: "++id, week, createdAt, &uid, updatedAt, dirty",
    kickSessions: "++id, startedAt, &uid, updatedAt, dirty",
    contractionEntries: "++id, startedAt, &uid, updatedAt, dirty",
    weightEntries: "++id, date, &uid, updatedAt, dirty",
    checklistState: "++id, &key, &uid, updatedAt, dirty",
    cycles: "++id, startDate, createdAt, &uid, updatedAt, dirty",
    cycleSettings: "++id, &uid, updatedAt, dirty",
    clinical: "++id, &uid, updatedAt, dirty",
    syncState: "&key",
    conflicts: "++id, store, recordId, resolved",
  },
  6: {
    sleepEntries: "++id, date, &uid, updatedAt, dirty",
    favoriteNames: "++id, &name, &uid, updatedAt, dirty",
  },
  7: {
    photoEntries: "++id, week, createdAt, &uid, uploadedAt",
    carnePhotos: "++id, createdAt, &uid, uploadedAt",
  },
};

/** Every version with a fixture, oldest first. */
export const VERSIONS = Object.keys(SCHEMAS)
  .map(Number)
  .sort((a, b) => a - b);

export const CURRENT_VERSION = VERSIONS[VERSIONS.length - 1]!;

/** The cumulative schema as a device on `version` would have it. */
export function schemaAt(version: number): Record<string, string> {
  const stores: Record<string, string> = {};
  for (const v of VERSIONS) {
    if (v > version) break;
    Object.assign(stores, SCHEMAS[v]);
  }
  return stores;
}

/** A fixed moment, so nothing in a fixture depends on when the test ran. */
export const SEEDED_AT = 1_700_000_000_000;

/**
 * The rows a device could hold at each version.
 *
 * Deliberately small and deliberately *period-accurate*: a v1 profile has no
 * `uid` because v1 had no `uid`, and that absence is the whole point — the v5
 * upgrade has to invent one, and the current code has to read a row it invented
 * one for.
 */
export const SEED: Record<number, Record<string, Record<string, unknown>[]>> = {
  1: {
    profile: [{ mode: "embarazada", city: "Asunción" }],
    pregnancy: [{ lmpDate: SEEDED_AT - 70 * 24 * 60 * 60 * 1000 }],
    journalEntries: [
      { week: 12, createdAt: SEEDED_AT, mood: "bien", note: "primera eco" },
    ],
    kickSessions: [{ startedAt: SEEDED_AT, count: 10 }],
    contractionEntries: [{ startedAt: SEEDED_AT, durationSeconds: 45 }],
    weightEntries: [{ date: SEEDED_AT, kg: 62.5 }],
    checklistState: [{ key: "bolso-carnet", done: true }],
  },
  2: {
    photoEntries: [{ week: 12, createdAt: SEEDED_AT, blob: "not-a-blob" }],
  },
  3: {
    cycles: [{ startDate: SEEDED_AT, createdAt: SEEDED_AT }],
    cycleSettings: [{ averageLength: 28 }],
  },
  4: {
    carnePhotos: [{ createdAt: SEEDED_AT, blob: "not-a-blob" }],
    clinical: [{ bloodType: "O+" }],
  },
  5: {
    // From v5 a device writes its own bookkeeping, so the fixture carries it.
    syncState: [{ key: "default", lastPulledAt: SEEDED_AT, dirtyCount: 0 }],
  },
  6: {
    sleepEntries: [
      { date: SEEDED_AT, hours: 7, uid: "sleep-1", updatedAt: SEEDED_AT, dirty: 1 },
    ],
    favoriteNames: [
      { name: "Arami", uid: "key:Arami", updatedAt: SEEDED_AT, dirty: 1 },
    ],
  },
  7: {},
};

/** Everything a device on `version` would have, store by store. */
export function seedAt(version: number): Record<string, Record<string, unknown>[]> {
  const rows: Record<string, Record<string, unknown>[]> = {};
  for (const v of VERSIONS) {
    if (v > version) break;
    for (const [store, entries] of Object.entries(SEED[v] ?? {})) {
      rows[store] = [...(rows[store] ?? []), ...entries];
    }
  }
  return rows;
}

/**
 * Create and populate a `mibebe` database frozen at `version`, then close it.
 *
 * The caller then opens `new MiBebeDB()` over the top, which is exactly what a
 * user's phone does the first time it loads a build with a newer chain.
 */
export async function seedDatabaseAt(version: number): Promise<void> {
  const database = new Dexie("mibebe");
  database.version(version).stores(schemaAt(version));
  await database.open();

  const rows = seedAt(version);
  for (const [store, entries] of Object.entries(rows)) {
    if (entries.length === 0) continue;
    await database.table(store).bulkAdd(entries.map((row) => stamp(store, row, version)));
  }

  database.close();
}

/**
 * What `lib/db.ts`'s hooks would already have written, at this version.
 *
 * A fixture is created through a plain Dexie, so no hook runs — but a *phone*
 * on v5 wrote every row through them and therefore has `uid`, `updatedAt`,
 * `deletedAt` and `dirty` on every synced row. Seeding without them would
 * describe a device that never existed, and the upgrade tests would then be
 * asserting that today's code repairs damage no user has.
 *
 * Before v5 the fields did not exist and are deliberately absent: that is the
 * case the v5 backfill is for.
 */
function stamp(
  store: string,
  row: Record<string, unknown>,
  version: number,
): Record<string, unknown> {
  if (version >= 5 && isSyncedStore(store)) {
    return {
      uid: recordIdFor(store, row, () => `${store}-seed`),
      updatedAt: SEEDED_AT,
      deletedAt: null,
      dirty: 1,
      ...row,
    };
  }
  // v7 gave the photo stores a uid. They are not synced and never gain the
  // rest of the bookkeeping.
  if (version >= 7 && (store === "photoEntries" || store === "carnePhotos")) {
    return { uid: `${store}-seed`, ...row };
  }
  return row;
}

/** Re-exported so a test can assert against the same list the fixture used. */
export { SYNCED_STORES };
