import Dexie, { type Table } from "dexie";
import type { DepartmentSlug } from "./types";

// On-device storage (build spec §5). This data NEVER leaves the device.
// Only derived `trimester` and stored `department` are ever sent to the server.

export interface Profile {
  id?: number;
  department: DepartmentSlug;
  city?: string;
  createdAt: number;
}

export interface Pregnancy {
  id?: number;
  lmpDate: number;
  dueDate: number;
  createdAt: number;
}

export interface JournalEntry {
  id?: number;
  week: number;
  symptoms: string[];
  // When a PIN is set, `note` is stored encrypted (see lib/crypto.ts).
  note: string;
  noteEncrypted?: boolean;
  createdAt: number;
}

export interface KickSession {
  id?: number;
  startedAt: number;
  count: number;
  completedAt?: number;
}

export interface ContractionEntry {
  id?: number;
  startedAt: number;
  durationSec: number;
  intervalSec: number;
}

export interface WeightEntry {
  id?: number;
  date: number;
  kg: number;
}

export interface ChecklistStateRow {
  id?: number;
  key: string;
  done: boolean;
}

export class NidoDB extends Dexie {
  profile!: Table<Profile, number>;
  pregnancy!: Table<Pregnancy, number>;
  journalEntries!: Table<JournalEntry, number>;
  kickSessions!: Table<KickSession, number>;
  contractionEntries!: Table<ContractionEntry, number>;
  weightEntries!: Table<WeightEntry, number>;
  checklistState!: Table<ChecklistStateRow, number>;

  constructor() {
    super("nido");
    this.version(1).stores({
      profile: "++id",
      pregnancy: "++id",
      journalEntries: "++id, week, createdAt",
      kickSessions: "++id, startedAt",
      contractionEntries: "++id, startedAt",
      weightEntries: "++id, date",
      checklistState: "++id, &key",
    });
  }
}

// Lazily instantiate so this module is safe to import in server components.
let _db: NidoDB | null = null;
export function db(): NidoDB {
  if (typeof window === "undefined") {
    throw new Error("NidoDB is only available in the browser");
  }
  if (!_db) _db = new NidoDB();
  return _db;
}

/** Wipe ALL local data (build spec §5 — "Borrar todos mis datos"). */
export async function wipeAllData(): Promise<void> {
  if (typeof window === "undefined") return;
  const instance = _db ?? new NidoDB();
  await instance.delete();
  _db = null;
}
