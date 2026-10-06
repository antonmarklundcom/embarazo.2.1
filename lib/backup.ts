import { db, type SyncStateRow } from "./db";
import {
  exportPinMaterial,
  importPinMaterial,
  type PinMaterial,
} from "./crypto";
import { dataUrlToBlob } from "./dataUrl";

// Local backup/restore (Phase 0 hardening). All health data lives only in
// IndexedDB (see lib/db.ts) — if the browser evicts storage, the phone is
// lost, or the user reinstalls, everything is gone with no export. This
// gives users a way to save a copy themselves and restore it later, without
// any of it ever touching a server.

// v2 added `pin`: the salt + verifier for encrypted journal notes.
// v3 adds the two v6 stores (`sleepEntries`, `favoriteNames`), which v2 never
// exported, and `account`: which account this device's data was linked to when
// the copy was taken (A6), so a restore can no longer silently re-link it.
// v1 and v2 files are still accepted.
export const BACKUP_VERSION = 3;

/**
 * Every persisted user-data store, in one place.
 *
 * Export and import both iterate this list, and `test/db/backup.test.ts`
 * asserts it equals every Dexie table minus the sync bookkeeping. A store added
 * to lib/db.ts without being added here fails that test instead of being
 * silently left out of everyone's backups (which is what happened to the two
 * v6 stores).
 */
export const BACKUP_TABLES = [
  "profile",
  "pregnancy",
  "journalEntries",
  "kickSessions",
  "contractionEntries",
  "weightEntries",
  "checklistState",
  "photoEntries",
  "cycles",
  "cycleSettings",
  "carnePhotos",
  "clinical",
  "sleepEntries",
  "favoriteNames",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

/** Stores whose rows carry a photo `blob`, serialised as a data URL. */
const PHOTO_TABLES: readonly BackupTable[] = ["photoEntries", "carnePhotos"];

interface BackupFile {
  app: "mibebe";
  version: number;
  exportedAt: number;
  /**
   * PIN salt + verifier (never the PIN). Encrypted notes are in `tables`, but
   * the key material lives in localStorage; without this, a restore on a new
   * device leaves every encrypted note permanently unreadable.
   */
  pin?: PinMaterial | null;
  /** v3: the account the data was linked to, or null for local-only data. */
  account?: string | null;
  tables: Partial<Record<BackupTable, unknown[]>>;
}

/** A restore that was refused before anything on the device was touched. */
export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

const NOT_A_BACKUP = "Este archivo no es una copia de seguridad válida de Mi Bebé.";

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Blob → `data:` URL without FileReader, so the same code runs in the browser
 * and in the fake-IndexedDB tests. Chunked so a large photo does not blow the
 * argument limit of `String.fromCharCode`.
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const type = blob.type || "application/octet-stream";
  return `data:${type};base64,${btoa(binary)}`;
}

async function serializeRows(table: BackupTable, rows: unknown[]): Promise<unknown[]> {
  if (!PHOTO_TABLES.includes(table)) return rows;
  return Promise.all(
    (rows as { blob: Blob }[]).map(async (row) => ({
      ...row,
      blob: await blobToDataUrl(row.blob),
    })),
  );
}

/** Build a full backup of every local table as a downloadable JSON blob. */
export async function exportBackup(): Promise<Blob> {
  const instance = db();
  const tables: Partial<Record<BackupTable, unknown[]>> = {};
  for (const name of BACKUP_TABLES) {
    tables[name] = await serializeRows(name, await instance.table(name).toArray());
  }
  const sync = (await instance.syncState.get("default")) as SyncStateRow | undefined;

  const file: BackupFile = {
    app: "mibebe",
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    pin: exportPinMaterial(),
    account: sync?.accountId ?? null,
    tables,
  };

  return new Blob([JSON.stringify(file)], { type: "application/json" });
}

export function backupFileName(): string {
  const d = new Date().toISOString().slice(0, 10);
  return `mibebe-backup-${d}.json`;
}

// ---------------------------------------------------------------------------
// Validation — all of it before the first write
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validPin(value: unknown): PinMaterial | null {
  if (value === undefined || value === null) return null;
  if (
    isPlainObject(value) &&
    typeof value.salt === "string" &&
    typeof value.verifier === "string"
  ) {
    return { salt: value.salt, verifier: value.verifier };
  }
  throw new BackupError(NOT_A_BACKUP);
}

interface ValidBackup {
  version: number;
  pin: PinMaterial | null;
  account: string | null;
  tables: Record<BackupTable, Record<string, unknown>[]>;
}

/**
 * Check the whole file, and decode every photo, before anything is cleared.
 *
 * A missing table is an empty one (v1/v2 files predate the newer stores);
 * a table that is present must be an array of objects. Photos must be inline
 * image bytes — a URL is refused rather than fetched (lib/dataUrl.ts).
 */
export function validateBackup(parsed: unknown): ValidBackup {
  if (!isPlainObject(parsed) || parsed.app !== "mibebe") {
    throw new BackupError(NOT_A_BACKUP);
  }
  const version = parsed.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new BackupError(NOT_A_BACKUP);
  }
  if (version > BACKUP_VERSION) {
    throw new BackupError(
      "Esta copia se hizo con una versión más nueva de Mi Bebé. Actualizá la app y probá de nuevo.",
    );
  }
  if (!isPlainObject(parsed.tables)) throw new BackupError(NOT_A_BACKUP);

  const source = parsed.tables;
  const tables = {} as Record<BackupTable, Record<string, unknown>[]>;
  for (const name of BACKUP_TABLES) {
    const rows = source[name];
    if (rows === undefined) {
      tables[name] = [];
      continue;
    }
    if (!Array.isArray(rows) || !rows.every(isPlainObject)) {
      throw new BackupError(NOT_A_BACKUP);
    }
    tables[name] = rows as Record<string, unknown>[];
  }

  const account =
    typeof parsed.account === "string" && parsed.account.length > 0
      ? parsed.account
      : null;

  return { version, pin: validPin(parsed.pin), account, tables };
}

function decodePhotos(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    try {
      return { ...row, blob: dataUrlToBlob(row.blob) };
    } catch {
      throw new BackupError(
        "Una de las fotos del archivo está dañada o no es una imagen. No cambiamos nada en este teléfono.",
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Restore a backup produced by exportBackup(). This REPLACES all current
 * local data (the caller is responsible for confirming with the user first).
 *
 * All-or-nothing: the file is validated and every photo decoded before the
 * transaction starts, and the clears and adds share one transaction, so a bad
 * file leaves the device exactly as it was.
 */
export async function importBackup(file: File): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new BackupError(NOT_A_BACKUP);
  }
  const backup = validateBackup(parsed);

  const rows = { ...backup.tables };
  for (const name of PHOTO_TABLES) rows[name] = decodePhotos(rows[name]);

  const instance = db();
  await instance.transaction(
    "rw",
    [
      ...BACKUP_TABLES.map((name) => instance.table(name)),
      instance.syncState,
      instance.conflicts,
    ],
    async () => {
      // Every store is cleared, including ones an older file does not carry:
      // a restore replaces the device's data, it does not merge into it. (Left
      // alone, the v6 stores used to survive a restore and mix the old
      // device's sleep log and names into the restored profile.)
      for (const name of BACKUP_TABLES) await instance.table(name).clear();
      await instance.conflicts.clear();

      // A3: the pull cursor described the OLD data, so it restarts at zero and
      // the next sync reconciles the restored rows from scratch. Restored rows
      // that predate v5 carry no `uid`; the creating hook in lib/db.ts stamps
      // them on the way in and marks them dirty, so they upload rather than sit
      // invisible.
      //
      // A6: the account link travels with the data. A v3 file restores the
      // account its rows belonged to, so restoring somebody's copy on a phone
      // signed in to a different account is refused by sync (the same
      // "these are another account's data" rule) instead of being uploaded
      // into it. A local-only copy — or a v1/v2 file, whose provenance is
      // unknown — is linked the way any local data is: on the next sign-in.
      await instance.syncState.clear();
      if (backup.account) {
        await instance.syncState.put({
          key: "default",
          lastPulledAt: 0,
          accountId: backup.account,
        });
      }

      for (const name of BACKUP_TABLES) {
        if (rows[name].length > 0) {
          await instance.table(name).bulkAdd(rows[name] as never[]);
        }
      }
    },
  );

  // After the rows land, adopt the backup's PIN material so encrypted notes in
  // it can be unlocked with the PIN they were written under. A v1 file (or one
  // taken with no PIN) clears whatever this device had — its notes are
  // plaintext, and leaving a stale PIN in place would lock a lock with no door.
  importPinMaterial(backup.pin);
}
