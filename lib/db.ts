import Dexie, { type Table } from "dexie";
import type { DueDateMethod, WeekDisplay } from "./dueDate";
import type { DepartmentSlug } from "./types";

// On-device storage (build spec §5). This data NEVER leaves the device.
// Only derived `trimester` and stored `department` are ever sent to the server.

// App mode (build spec §3): the current pregnancy flow, or the new
// pre-pregnancy "planeando / buscando" flow. Stored locally on the profile.
// Defaults to "embarazada" when missing (existing users keep their flow).
export type AppMode = "embarazada" | "planeando";

// Who is using the app (BUILD-PLAN B1 / FEATURE-MAP #1). Drives tone and which
// home content shows. Optional for back-compat: missing means "mama".
export type UserRole = "mama" | "papa" | "acompanante" | "familiar";

export const USER_ROLES: UserRole[] = [
  "mama",
  "papa",
  "acompanante",
  "familiar",
];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  mama: "Soy la mamá",
  papa: "Soy el papá",
  acompanante: "Acompaño a la mamá",
  familiar: "Familiar o amiga",
};

export interface Profile {
  id?: number;
  department: DepartmentSlug;
  city?: string;
  // Next prenatal appointment (build spec §4). Local-only, NO push. Optional.
  nextAppointment?: number;
  // Pregnancy vs. pre-pregnancy mode (build spec §3). Optional for back-compat.
  mode?: AppMode;
  // B1: relationship to the baby. Missing = "mama" (every existing user).
  role?: UserRole;
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

export interface Pregnancy {
  id?: number;
  /**
   * Effective LMP. Every due-date method reduces to this (see lib/dueDate.ts),
   * so the rest of the app is unchanged no matter how the user entered it.
   */
  lmpDate: number;
  dueDate: number;
  createdAt: number;

  // --- B3 (FEATURE-MAP #4, #5, #6). All optional, all non-indexed, so no
  // Dexie version bump is needed and existing rows keep working.

  /** How the user gave us the date, so Ajustes can re-open the same form. */
  dueDateMethod?: DueDateMethod;
  /** Total gestation length in days. Missing = 280 (40+0). */
  gestationDays?: number;
  /** "24+3" (default, matches the carné) or "25". */
  weekDisplay?: WeekDisplay;
  /**
   * A scheduled delivery date, separate from the estimate. Common in Paraguay,
   * where planned cesáreas have a fixed date that is not the FPP.
   */
  plannedDeliveryDate?: number;
}

/**
 * One baby per pregnancy — plural from the start (BUILD-PLAN B2 /
 * FEATURE-MAP #2, #3). Twins UI comes later, but modelling it now means no
 * migration then.
 */
export interface Baby {
  id?: number;
  /** 1 for a single baby, 1..n for multiples. */
  order: number;
  /** Optional nickname. Threaded through copy: "Silvia ya mide…". */
  nickname?: string;
  createdAt: number;
}

export interface JournalEntry {
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
export interface PhotoEntry {
  id?: number;
  week: number;
  blob: Blob;
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

// Pre-pregnancy / cycle module (build spec §3). All device-only.
export interface Cycle {
  id?: number;
  // First day of the period (a cycle start). Stored as a timestamp.
  startDate: number;
  // Optional last day of bleeding for this period.
  endDate?: number;
  createdAt: number;
}

export interface CycleSettings {
  id?: number;
  avgCycleLength: number; // default 28
  avgPeriodLength: number; // default 5
}

// Digital carné perinatal (v4). Photos of the paper carné pages + key
// clinical basics. Device-only, like every other health record here.
export interface CarnePhoto {
  id?: number;
  blob: Blob;
  createdAt: number;
}

export interface ClinicalInfo {
  id?: number;
  /** e.g. "O+", "A−" — free choice from the UI's fixed list. */
  bloodType?: string;
  allergies?: string;
  /** Chronic conditions, current medication, anything the guardia should know. */
  notes?: string;
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
  babies!: Table<Baby, number>;

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
    // v5: babies (B2). Additive only. Modelled as a table rather than a field
    // on `pregnancy` so twins need no migration later.
    this.version(5).stores({
      babies: "++id, order",
    });
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

/** Wipe ALL local data (build spec §5 — "Borrar todos mis datos"). */
export async function wipeAllData(): Promise<void> {
  if (typeof window === "undefined") return;
  const instance = _db ?? new MiBebeDB();
  await instance.delete();
  _db = null;
}
