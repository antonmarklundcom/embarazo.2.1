import Dexie, { type Table } from "dexie";
import type { DepartmentSlug } from "./types";
import type { SyncMeta } from "./sync/merge";
import { notifyLocalChange } from "./sync/signal";
import {
  SYNCED_STORES,
  type SyncedStore,
  recordIdFor,
} from "./sync/stores";

// On-device storage (build spec §5). IndexedDB is the source of truth and the
// app works fully offline against it, with or without an account
// (ARCHITECTURE.md §4.1). Since A3 the stores in SYNCED_STORES *may* be copied
// to the server as an opaque payload when — and only when — the user has
// signed in. Photos never are.

// App mode (build spec §3): the current pregnancy flow, or the new
// pre-pregnancy "planeando / buscando" flow. Stored locally on the profile.
// Defaults to "embarazada" when missing (existing users keep their flow).
export type AppMode = "embarazada" | "planeando";

// Baby identity (B2, feature map #2/#3). One entry per baby; index order is
// birth order. An object per baby (not a bare string array) so a later task
// can add per-baby fields (e.g. sex once known) without a schema migration —
// today only `name` is collected.
export interface BabyIdentity {
  name?: string;
}

// Relationship role (B1, feature map #1): who is using the app, relative to
// the pregnancy. Drives copy tone (lib/roleCopy.ts), not access — that is
// the separate MemberRole (owner/partner/family) E1 introduces for family
// sharing between *different* accounts. "mama" is the default for anyone who
// onboarded before this field existed.
export type Role = "mama" | "papa" | "acompanante" | "familiar";

export interface Profile extends Partial<SyncMeta> {
  id?: number;
  department: DepartmentSlug;
  city?: string;
  // Next prenatal appointment (build spec §4). Local-only, NO push. Optional.
  nextAppointment?: number;
  // Pregnancy vs. pre-pregnancy mode (build spec §3). Optional for back-compat.
  mode?: AppMode;
  // Baby identity/twins (B2). Optional for back-compat; empty/undefined means
  // no nickname yet. Plain non-indexed field — adding a second baby is just
  // pushing to this array, no Dexie schema version bump.
  babies?: BabyIdentity[];
  /**
   * K3 — which extra fields the owner shares with her pareja (never with
   * `family`). Absent means everything off; `parsePreferences` in
   * lib/sharing/levels.ts is the only thing that reads it, and it defaults
   * every unknown answer to not sharing.
   */
  sharing?: Record<string, boolean>;
  /**
   * K8 — this device wants to be reminded of the control of the pregnancy it
   * is *accompanying*, not (only) its own.
   *
   * It lives in Dexie rather than localStorage for one reason: the service
   * worker composes the notification text and cannot read localStorage. The
   * flag is device-local either way — the server is told a list of timestamps
   * and never what they are for (B5).
   */
  companionReminder?: boolean;
  /**
   * K4 — whether this account backs up bump and carné photos
   * (ARCHITECTURE.md §4.4, amended from "never" to "explicit opt-in").
   *
   * Off unless she turned it on, and turning it off deletes the server copies.
   */
  photoBackup?: boolean;
  // Relationship role (B1). Optional for back-compat; defaults to "mama".
  // Plain non-indexed field, so no Dexie schema version bump is needed.
  role?: Role;
  // Emergency mode contacts (local-only, optional, never transmitted). These
  // are plain non-indexed fields, so no Dexie schema version bump is needed.
  sanatorioName?: string;
  sanatorioPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: number;
}

// Mood scale for the daily journal entry (build spec §2), es-PY labels.
export type Mood = "muy_bien" | "bien" | "regular" | "mal" | "muy_mal";

export interface Pregnancy extends Partial<SyncMeta> {
  id?: number;
  lmpDate: number;
  dueDate: number;
  createdAt: number;
  // B3: which method produced `lmpDate` (LMP is always the stored anchor —
  // see lib/pregnancy.ts's lmpFrom* functions). Optional for back-compat;
  // an existing pregnancy with no method was entered via raw LMP or the
  // pre-B3 "due date" toggle, both of which are "lmp"/"ecografia"-equivalent.
  method?: "lmp" | "ecografia" | "fiv" | "conception";
  // Adjustable pregnancy length in days (build spec default 280). Optional;
  // falls back to GESTATION_DAYS when unset. Plain non-indexed field, no
  // Dexie schema version bump needed.
  gestationDays?: number;
  // Planned delivery date (e.g. a scheduled cesárea), separate from the
  // estimated `dueDate` (feature map #6). Optional, local-only.
  plannedDeliveryDate?: number;
}

export interface JournalEntry extends Partial<SyncMeta> {
  id?: number;
  week: number;
  mood?: Mood;
  symptoms: string[];
  // When a PIN is set, `note` is stored encrypted (see lib/crypto.ts).
  note: string;
  noteEncrypted?: boolean;
  createdAt: number;
}

// Belly photos (build spec §5). The Blob NEVER leaves the device.
export interface PhotoEntry extends Partial<PhotoBackupMeta> {
  id?: number;
  week: number;
  blob: Blob;
  createdAt: number;
}

/**
 * K4 — bookkeeping for opt-in photo backup (ARCHITECTURE.md §4.4, amended).
 *
 * Deliberately NOT `SyncMeta`: photos do not ride the sync engine. They have
 * their own opt-in pipeline (`lib/photos/client.ts`) and their own server
 * table, because the bytes belong in object storage rather than in an opaque
 * JSON payload. What they share with SyncMeta is only the idea of a **stable
 * cross-device id** — Dexie's `++id` is per-device and could never be one.
 */
export interface PhotoBackupMeta {
  /** Stable across devices. Stamped by a hook so no call site can forget it. */
  uid: string;
  /** When this device last confirmed the upload. Absent means "not yet". */
  uploadedAt?: number;
}

export interface KickSession extends Partial<SyncMeta> {
  id?: number;
  startedAt: number;
  count: number;
  completedAt?: number;
}

export interface ContractionEntry extends Partial<SyncMeta> {
  id?: number;
  startedAt: number;
  durationSec: number;
  intervalSec: number;
}

export interface WeightEntry extends Partial<SyncMeta> {
  id?: number;
  date: number;
  kg: number;
}

// D2 — sleep log. One row per night, keyed by the date you woke up, so a
// 23:00→06:00 night is a single entry rather than two half-nights.
export interface SleepEntry extends Partial<SyncMeta> {
  id?: number;
  /** Epoch ms, midnight of the morning you woke up. */
  date: number;
  /** Minutes actually slept, as the user estimates them. */
  minutes: number;
  /** 1 = terrible, 5 = great. Deliberately coarse; nobody rates sleep to 10%. */
  quality: number;
  /** Optional: what got in the way (acidez, calor, baño, ansiedad…). */
  reasons?: string[];
}

// D2 — favourite baby names. The name itself, not an id: the list can grow,
// and a favourite must not break when a name is retired from the catalogue.
export interface FavoriteName extends Partial<SyncMeta> {
  id?: number;
  name: string;
  createdAt: number;
}

export interface ChecklistStateRow extends Partial<SyncMeta> {
  id?: number;
  key: string;
  done: boolean;
}

// Pre-pregnancy / cycle module (build spec §3). All device-only.
export interface Cycle extends Partial<SyncMeta> {
  id?: number;
  // First day of the period (a cycle start). Stored as a timestamp.
  startDate: number;
  // Optional last day of bleeding for this period.
  endDate?: number;
  createdAt: number;
}

export interface CycleSettings extends Partial<SyncMeta> {
  id?: number;
  avgCycleLength: number; // default 28
  avgPeriodLength: number; // default 5
}

// Digital carné perinatal (v4). Photos of the paper carné pages + key
// clinical basics. Device-only, like every other health record here.
export interface CarnePhoto extends Partial<PhotoBackupMeta> {
  id?: number;
  blob: Blob;
  createdAt: number;
}

export interface ClinicalInfo extends Partial<SyncMeta> {
  id?: number;
  /** e.g. "O+", "A−" — free choice from the UI's fixed list. */
  bloodType?: string;
  allergies?: string;
  /** Chronic conditions, current medication, anything the guardia should know. */
  notes?: string;
}

// ---------------------------------------------------------------------------
// v5 — sync bookkeeping (BUILD-PLAN A3)
// ---------------------------------------------------------------------------

/**
 * Where sync got to. One row, keyed so it can never accidentally become two.
 *
 * `lastPulledAt` is a *server* clock value, taken from the pull response. It is
 * deliberately not a local timestamp: the device clock and the server clock
 * disagree, and using the local one would skip records written in the gap.
 */
export interface SyncStateRow {
  key: "default";
  lastPulledAt: number;
  lastSyncAt?: number;
  /** Set when the last attempt failed, so the UI can be honest about it. */
  lastError?: string;
  /**
   * A6: the account this device's data was last synced with.
   *
   * Undefined means "never linked" — a local-only user, whose data uploads on
   * first sign-in. A value that does not match the current session means the
   * data on this phone belongs to somebody else's account, and the engine
   * refuses to push it. Without this field that refusal is impossible, and
   * signing out and back in as a different Google account silently uploads
   * one person's health records into another person's account.
   */
  accountId?: string;
  /** True once a first upload for `accountId` has completed (A6). */
  linkedAt?: number;
}

/**
 * A local version that lost a last-write-wins comparison.
 *
 * Only journal notes land here (see `lib/sync/merge.ts`). The row keeps the
 * losing text verbatim so "surfaced, never silently dropped" is literally true
 * — the user decides whether to restore it.
 */
export interface ConflictRow {
  id?: number;
  store: SyncedStore;
  recordId: string;
  detectedAt: number;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  /** The losing local payload, exactly as it was. */
  localPayload: Record<string, unknown> | null;
  /** 0 until the user keeps or discards it. Indexed so the banner is cheap. */
  resolved: number;
}

/** A record id that is unique across devices. `++id` is not. */
/**
 * K4 — the two stores opt-in photo backup covers.
 *
 * Named here rather than imported from `lib/photos/keys.ts` for the same reason
 * `SYNCED_STORES` lives in `lib/sync/stores.ts`: this is the Dexie side of the
 * agreement, and a test asserts the two lists match so they cannot drift.
 */
export const PHOTO_BACKUP_STORES = ["photoEntries", "carnePhotos"] as const;

function newRecordId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Older WebViews (Android 12 and below ship Chrome without randomUUID on
  // insecure origins). Random enough for a per-user id space.
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export class MiBebeDB extends Dexie {
  profile!: Table<Profile, number>;
  pregnancy!: Table<Pregnancy, number>;
  journalEntries!: Table<JournalEntry, number>;
  kickSessions!: Table<KickSession, number>;
  contractionEntries!: Table<ContractionEntry, number>;
  weightEntries!: Table<WeightEntry, number>;
  checklistState!: Table<ChecklistStateRow, number>;
  photoEntries!: Table<PhotoEntry, number>;
  cycles!: Table<Cycle, number>;
  cycleSettings!: Table<CycleSettings, number>;
  carnePhotos!: Table<CarnePhoto, number>;
  clinical!: Table<ClinicalInfo, number>;
  sleepEntries!: Table<SleepEntry, number>;
  favoriteNames!: Table<FavoriteName, number>;
  syncState!: Table<SyncStateRow, string>;
  conflicts!: Table<ConflictRow, number>;

  constructor() {
    super("mibebe");
    this.version(1).stores({
      profile: "++id",
      pregnancy: "++id",
      journalEntries: "++id, week, createdAt",
      kickSessions: "++id, startedAt",
      contractionEntries: "++id, startedAt",
      weightEntries: "++id, date",
      checklistState: "++id, &key",
    });
    // v2: belly photo diary (build spec §5). New store; existing stores
    // unchanged, so the upgrade is purely additive.
    this.version(2).stores({
      photoEntries: "++id, week, createdAt",
    });
    // v3: pre-pregnancy / cycle module (build spec §3). Additive only — no
    // existing store is modified, so prior data is preserved on upgrade.
    this.version(3).stores({
      cycles: "++id, startDate, createdAt",
      cycleSettings: "++id",
    });
    // v4: digital carné perinatal (photos of the paper carné + clinical
    // basics). Additive only.
    this.version(4).stores({
      carnePhotos: "++id, createdAt",
      clinical: "++id",
    });
    // v5: sync bookkeeping (BUILD-PLAN A3). Every synced store gains `uid`
    // (stable across devices), `updatedAt`, `deletedAt` and `dirty`, plus the
    // two local tables the engine needs. `photoEntries` and `carnePhotos` are
    // untouched — they never sync (ARCHITECTURE.md §4.4).
    this.version(5)
      .stores({
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
      })
      .upgrade(async (tx) => {
        // Backfill every existing row so it has a sync identity. Rows are
        // stamped `dirty = 1`: a user upgrading has data the server has never
        // seen, and the first sync after they sign in should upload all of it
        // rather than treat it as already-known.
        //
        // IndexedDB does not index a missing key path, so the `&uid` unique
        // index tolerates the un-backfilled rows that exist for the duration
        // of this transaction.
        for (const store of SYNCED_STORES) {
          const table = tx.table(store);
          const rows = await table.toArray();
          let singletonTaken = false;
          for (const row of rows) {
            const preferred = recordIdFor(store, row, newRecordId);
            // Guard the singleton stores: if a device somehow accumulated two
            // profile rows, only the first can claim the fixed id. The extras
            // get their own so the upgrade cannot fail on a unique index.
            const uid =
              preferred === "singleton" && singletonTaken
                ? newRecordId()
                : preferred;
            if (preferred === "singleton") singletonTaken = true;

            await table.update(row.id, {
              uid,
              updatedAt: typeof row.createdAt === "number" ? row.createdAt : 0,
              deletedAt: null,
              dirty: 1,
            });
          }
        }
      });

    // v6 (D2): sleep log and favourite names. Additive — no existing store is
    // touched — and both carry sync bookkeeping from the start, so they need no
    // backfill upgrade the way v5's stores did.
    this.version(6).stores({
      sleepEntries: "++id, date, &uid, updatedAt, dirty",
      favoriteNames: "++id, &name, &uid, updatedAt, dirty",
    });

    // v7 (K4): opt-in photo backup. The two photo stores gain a stable
    // cross-device `uid` and an `uploadedAt` marker. They are still NOT in
    // SYNCED_STORES — photos do not ride the sync engine, they have their own
    // pipeline and their own server table — so this adds indexes, not sync.
    this.version(7)
      .stores({
        photoEntries: "++id, week, createdAt, &uid, uploadedAt",
        carnePhotos: "++id, createdAt, &uid, uploadedAt",
      })
      .upgrade(async (tx) => {
        // Backfill an id for photos that already exist. `uploadedAt` stays
        // absent, which is exactly right: nothing has been uploaded, and if the
        // user opts in these are the first things to go.
        for (const store of PHOTO_BACKUP_STORES) {
          const table = tx.table(store);
          for (const row of await table.toArray()) {
            if (typeof row.uid !== "string") {
              await table.update(row.id, { uid: newRecordId() });
            }
          }
        }
      });

    this.registerSyncHooks();
    this.registerPhotoHooks();
  }

  /**
   * Stamp `uid` / `updatedAt` / `dirty` on every write to a synced store.
   *
   * Hooks rather than a wrapper API on purpose: there are ~30 existing call
   * sites writing to these tables, and a rule that lives in a helper is a rule
   * every future call site can forget. A hook cannot be forgotten.
   *
   * The stamping only fills fields the caller left undefined, which is what
   * lets the sync engine write `dirty: 0` and a server-authored `updatedAt`
   * when it applies a remote record — no global "I am syncing" flag to get
   * out of step with an await.
   */
  /**
   * Stamp a stable `uid` on every photo, wherever it is created.
   *
   * Same argument as `registerSyncHooks`: there are existing call sites that
   * write photos and a rule living in a helper is a rule a future call site
   * forgets. A photo with no `uid` is a photo the backup can never name.
   */
  private registerPhotoHooks(): void {
    for (const store of PHOTO_BACKUP_STORES) {
      const table = this.table(store) as Table<Record<string, unknown>, number>;
      table.hook("creating", (_primKey, obj) => {
        if (obj.uid === undefined) obj.uid = newRecordId();
      });
    }
  }

  private registerSyncHooks(): void {
    for (const store of SYNCED_STORES) {
      const table = this.table(store) as Table<Record<string, unknown>, number>;

      table.hook("creating", (_primKey, obj) => {
        if (obj.uid === undefined) obj.uid = recordIdFor(store, obj, newRecordId);
        if (obj.updatedAt === undefined) obj.updatedAt = Date.now();
        if (obj.deletedAt === undefined) obj.deletedAt = null;
        if (obj.dirty === undefined) obj.dirty = 1;
        if (obj.dirty === 1) notifyLocalChange();
      });

      table.hook("updating", (mods) => {
        const changes = mods as Record<string, unknown>;
        const extra: Record<string, unknown> = {};
        if (!("updatedAt" in changes)) extra.updatedAt = Date.now();
        if (!("dirty" in changes)) extra.dirty = 1;
        if ((extra.dirty ?? changes.dirty) === 1) notifyLocalChange();
        return Object.keys(extra).length > 0 ? extra : undefined;
      });
    }
  }
}

// Lazily instantiate so this module is safe to import in server components.
let _db: MiBebeDB | null = null;
export function db(): MiBebeDB {
  if (typeof window === "undefined") {
    throw new Error("MiBebeDB is only available in the browser");
  }
  if (!_db) _db = new MiBebeDB();
  return _db;
}

/**
 * Delete a row from a synced store.
 *
 * Synced stores are soft-deleted: the row stays with `deletedAt` set so the
 * deletion can reach the user's other devices. A hard `table.delete()` would
 * be undone by the next pull, which is the classic "I deleted it and it came
 * back" sync bug. Unsynced stores (photos) still delete for real — nothing is
 * waiting to hear about it.
 */
export async function softDelete(
  store: SyncedStore,
  id: number,
  now: number = Date.now(),
): Promise<void> {
  await db()
    .table(store)
    .update(id, { deletedAt: now });
}

/** Drop soft-deleted rows from a query result. */
export function notDeleted<T extends { deletedAt?: number | null }>(
  rows: T[] | undefined,
): T[] {
  return (rows ?? []).filter((row) => !row.deletedAt);
}

/** Wipe ALL local data (build spec §5 — "Borrar todos mis datos"). */
export async function wipeAllData(): Promise<void> {
  if (typeof window === "undefined") return;
  const instance = _db ?? new MiBebeDB();
  await instance.delete();
  _db = null;
}
