import { db } from "./db";
import {
  exportPinMaterial,
  importPinMaterial,
  type PinMaterial,
} from "./crypto";

// Local backup/restore (Phase 0 hardening). All health data lives only in
// IndexedDB (see lib/db.ts) — if the browser evicts storage, the phone is
// lost, or the user reinstalls, everything is gone with no export. This
// gives users a way to save a copy themselves and restore it later, without
// any of it ever touching a server.

// v2 adds `pin`: the salt + verifier for encrypted journal notes. v1 files are
// still accepted — they simply carry no PIN material, which is correct for a
// backup taken without a PIN.
const BACKUP_VERSION = 2;

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
  tables: {
    profile: unknown[];
    pregnancy: unknown[];
    journalEntries: unknown[];
    kickSessions: unknown[];
    contractionEntries: unknown[];
    weightEntries: unknown[];
    checklistState: unknown[];
    photoEntries: unknown[];
    cycles: unknown[];
    cycleSettings: unknown[];
    carnePhotos: unknown[];
    clinical: unknown[];
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

async function serializeBlobRows<T extends { blob: Blob }>(
  rows: T[],
): Promise<(Omit<T, "blob"> & { blob: string })[]> {
  return Promise.all(
    rows.map(async (row) => ({ ...row, blob: await blobToDataUrl(row.blob) })),
  );
}

async function deserializeBlobRows<T extends { blob: string }>(
  rows: T[],
): Promise<(Omit<T, "blob"> & { blob: Blob })[]> {
  return Promise.all(
    rows.map(async (row) => ({ ...row, blob: await dataUrlToBlob(row.blob) })),
  );
}

/** Build a full backup of every local table as a downloadable JSON blob. */
export async function exportBackup(): Promise<Blob> {
  const instance = db();
  const [
    profile,
    pregnancy,
    journalEntries,
    kickSessions,
    contractionEntries,
    weightEntries,
    checklistState,
    photoEntries,
    cycles,
    cycleSettings,
    carnePhotos,
    clinical,
  ] = await Promise.all([
    instance.profile.toArray(),
    instance.pregnancy.toArray(),
    instance.journalEntries.toArray(),
    instance.kickSessions.toArray(),
    instance.contractionEntries.toArray(),
    instance.weightEntries.toArray(),
    instance.checklistState.toArray(),
    instance.photoEntries.toArray(),
    instance.cycles.toArray(),
    instance.cycleSettings.toArray(),
    instance.carnePhotos.toArray(),
    instance.clinical.toArray(),
  ]);

  const file: BackupFile = {
    app: "mibebe",
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    pin: exportPinMaterial(),
    tables: {
      profile,
      pregnancy,
      journalEntries,
      kickSessions,
      contractionEntries,
      weightEntries,
      checklistState,
      photoEntries: await serializeBlobRows(photoEntries),
      cycles,
      cycleSettings,
      carnePhotos: await serializeBlobRows(carnePhotos),
      clinical,
    },
  };

  return new Blob([JSON.stringify(file)], { type: "application/json" });
}

export function backupFileName(): string {
  const d = new Date().toISOString().slice(0, 10);
  return `mibebe-backup-${d}.json`;
}

function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.app === "mibebe" && typeof v.version === "number" && !!v.tables;
}

/**
 * Restore a backup produced by exportBackup(). This REPLACES all current
 * local data (the caller is responsible for confirming with the user first).
 */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  if (!isBackupFile(parsed)) {
    throw new Error("Este archivo no es una copia de seguridad válida de Mi Bebé.");
  }

  const instance = db();
  const t = parsed.tables;
  const photoEntries = await deserializeBlobRows(
    t.photoEntries as { blob: string }[],
  );
  const carnePhotos = await deserializeBlobRows(
    t.carnePhotos as { blob: string }[],
  );

  await instance.transaction(
    "rw",
    [
      instance.profile,
      instance.pregnancy,
      instance.journalEntries,
      instance.kickSessions,
      instance.contractionEntries,
      instance.weightEntries,
      instance.checklistState,
      instance.photoEntries,
      instance.cycles,
      instance.cycleSettings,
      instance.carnePhotos,
      instance.clinical,
    ],
    async () => {
      await Promise.all([
        instance.profile.clear(),
        instance.pregnancy.clear(),
        instance.journalEntries.clear(),
        instance.kickSessions.clear(),
        instance.contractionEntries.clear(),
        instance.weightEntries.clear(),
        instance.checklistState.clear(),
        instance.photoEntries.clear(),
        instance.cycles.clear(),
        instance.cycleSettings.clear(),
        instance.carnePhotos.clear(),
        instance.clinical.clear(),
      ]);
      await Promise.all([
        instance.profile.bulkAdd(t.profile as never[]),
        instance.pregnancy.bulkAdd(t.pregnancy as never[]),
        instance.journalEntries.bulkAdd(t.journalEntries as never[]),
        instance.kickSessions.bulkAdd(t.kickSessions as never[]),
        instance.contractionEntries.bulkAdd(t.contractionEntries as never[]),
        instance.weightEntries.bulkAdd(t.weightEntries as never[]),
        instance.checklistState.bulkAdd(t.checklistState as never[]),
        instance.photoEntries.bulkAdd(photoEntries as never[]),
        instance.cycles.bulkAdd(t.cycles as never[]),
        instance.cycleSettings.bulkAdd(t.cycleSettings as never[]),
        instance.carnePhotos.bulkAdd(carnePhotos as never[]),
        instance.clinical.bulkAdd(t.clinical as never[]),
      ]);
    },
  );

  // After the rows land, adopt the backup's PIN material so encrypted notes in
  // it can be unlocked with the PIN they were written under. A v1 file (or one
  // taken with no PIN) clears whatever this device had — its notes are
  // plaintext, and leaving a stale PIN in place would lock a lock with no door.
  importPinMaterial(parsed.pin ?? null);
}
