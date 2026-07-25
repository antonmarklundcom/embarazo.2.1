import { db } from "./db";

// Local backup/restore (Phase 0 hardening). Health data is written to
// IndexedDB first (see lib/db.ts) and photos never sync, so a device-local
// export remains the only way to move photos to a new phone — and the only
// recovery path at all for someone using the app without an account.
//
// Version history:
//   1 — original tables.
//   2 — adds `babies` (B2). Purely additive: v1 files still import, they just
//       restore no babies. Never make a change here that a v1 file cannot
//       survive.

const BACKUP_VERSION = 2;

interface BackupFile {
  app: "mibebe";
  version: number;
  exportedAt: number;
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
    // v2 of the backup format (B2). Older files simply omit it.
    babies?: unknown[];
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
    babies,
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
    instance.babies.toArray(),
  ]);

  const file: BackupFile = {
    app: "mibebe",
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
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
      babies,
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
      instance.babies,
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
        instance.babies.clear(),
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
        // Older backups have no `babies` key — restore nothing rather than
        // failing the whole import.
        instance.babies.bulkAdd((t.babies ?? []) as never[]),
      ]);
    },
  );
}
