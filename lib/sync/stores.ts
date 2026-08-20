// BUILD-PLAN A3 — which Dexie stores sync, and how their records are named.
//
// This module is deliberately dependency-free and NOT server-only: it is the
// one place both sides of the sync agree on. `lib/server/schema.ts` imports
// SYNCED_STORES to build the `syncRecords.store` enum, and `lib/db.ts` uses
// the same list to decide which tables carry sync bookkeeping. Two lists that
// have to be kept in step by hand is exactly how a sync engine rots.
//
// Read ARCHITECTURE.md §4.4 before adding anything here. Adding a store is a
// data-contract decision, not a refactor.

/**
 * Dexie stores that sync to the server, by their *Dexie table name*.
 *
 * Photos (`photoEntries`, `carnePhotos`) are absent on purpose, and K18
 * corrects what that used to say here: it is not that photos "never leave the
 * device" — since K4 they do, if the user turns backup on (ARCHITECTURE.md
 * §4.4, amended). It is that they never travel **through this engine**. Photo
 * bytes go browser → presigned URL → object storage, and their index rows live
 * in `photoBlobs`, so a photo is never a `syncRecords.payload`. Adding one here
 * would put image data through a path built for small JSON envelopes.
 *
 * The bookkeeping tables (`syncState`, `conflicts`) are local machinery and are
 * never synced either.
 */
export const SYNCED_STORES = [
  "profile",
  "pregnancy",
  "journalEntries",
  "kickSessions",
  "contractionEntries",
  "weightEntries",
  "checklistState",
  "cycles",
  "cycleSettings",
  "clinical",
  // D2. Both are ordinary preference-ish data with no photo and no free text
  // beyond a name the user typed on purpose, so §4.4 has nothing against them
  // travelling — and a favourite names list that does not survive a new phone
  // is the one people would be angriest to lose.
  "sleepEntries",
  "favoriteNames",
] as const;

export type SyncedStore = (typeof SYNCED_STORES)[number];

/**
 * Stores that never sync, listed explicitly so the exclusion is testable
 * rather than implied by absence. Photos are excluded from *this* engine (see
 * above — K4 gave them their own path); the other two are local bookkeeping
 * that would be meaningless on another device.
 */
export const UNSYNCED_STORES = [
  "photoEntries",
  "carnePhotos",
  "syncState",
  "conflicts",
] as const;

export type UnsyncedStore = (typeof UNSYNCED_STORES)[number];

/**
 * Stores that hold at most one row per user.
 *
 * These get a *fixed* record id instead of a random one. Without that, a user
 * who onboards offline on two devices and then signs in ends up with two
 * profiles and two pregnancies, and last-write-wins has nothing to compare —
 * they are different records as far as the server is concerned. With a fixed
 * id the two rows are the same record and LWW merges them, which is the
 * behaviour a user expects from "sign in and my stuff is here".
 */
export const SINGLETON_STORES = [
  "profile",
  "pregnancy",
  "cycleSettings",
  "clinical",
] as const satisfies readonly SyncedStore[];

/** The record id every singleton store uses. */
export const SINGLETON_RECORD_ID = "singleton";

export function isSyncedStore(value: string): value is SyncedStore {
  return (SYNCED_STORES as readonly string[]).includes(value);
}

export function isSingletonStore(store: SyncedStore): boolean {
  return (SINGLETON_STORES as readonly string[]).includes(store);
}

/**
 * Stores whose rows have a natural key that is stable across devices. The
 * checklist is keyed by the checklist item's own key, so ticking "llevar el
 * carné" on two devices is one record, not two.
 */
export const NATURAL_KEY_FIELDS: Partial<Record<SyncedStore, string>> = {
  checklistState: "key",
  // D2: the name IS the identity. Favouriting "Arami" on the phone and on the
  // tablet has to be one record, or a re-sync gives you the same name twice.
  favoriteNames: "name",
};

/**
 * The record id for a row that is about to be created locally.
 *
 * Deterministic where the data has a natural identity (singletons, checklist
 * keys), random otherwise — Dexie's `++id` autoincrement is per-device and
 * would collide across devices, so it can never be the sync id.
 */
export function recordIdFor(
  store: SyncedStore,
  row: Record<string, unknown>,
  randomId: () => string,
): string {
  if (isSingletonStore(store)) return SINGLETON_RECORD_ID;

  const naturalField = NATURAL_KEY_FIELDS[store];
  if (naturalField) {
    const value = row[naturalField];
    if (typeof value === "string" && value.length > 0) {
      return `key:${value}`;
    }
  }

  return randomId();
}
