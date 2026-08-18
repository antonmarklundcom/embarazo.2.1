import { FORBIDDEN_COMPANION_FIELDS, type MemberRole } from "./fields";

// BUILD-PLAN K3 — sharing levels (docs/FABLE-PLAN-2026-08.md §3).
//
// E1's snapshot is the same four facts for everybody who is let in. K3 adds a
// second tier the owner controls per field, for the pareja only: her weight,
// her pataditas, her bump photos.
//
// The mechanism is the one E1 established and it is worth restating, because
// K3 is the first time it has to carry something a companion previously could
// not see under any circumstance:
//
//   **A level is a set of field names, and a field belongs to exactly one
//   level.** Publishing runs `applyLevels`, which starts from "everything
//   null" and fills in only the fields whose level is on. There is no path
//   through it that emits a field no level claims, so a new field added to
//   `SharedExtras` without being assigned to a level travels as null forever —
//   and a test asserts the partition is total, so that omission fails the build
//   rather than shipping quietly.
//
// Journal notes are not a level and never will be. They are the one thing in
// this app that has no sharing story at all: PIN-encrypted on the device, not
// synced (DECISIONS.md A3), and absent from every whitelist here.

export const SHARING_LEVELS = ["peso", "pataditas", "fotos"] as const;
export type SharingLevel = (typeof SHARING_LEVELS)[number];

export type SharingPreferences = Record<SharingLevel, boolean>;

/**
 * Everything off.
 *
 * Not a formality: this is what an owner who has never seen the toggles is
 * sharing, and what a corrupt or partial stored value falls back to. Sharing
 * her weight has to be something she did, not something she failed to prevent.
 */
export const SHARING_DEFAULTS: SharingPreferences = {
  peso: false,
  pataditas: false,
  fotos: false,
};

/**
 * The extra fields, all nullable, all null by default.
 *
 * Weight is grams rather than kilos so the wire carries an integer: MySQL
 * `decimal` comes back as a string in drizzle and a float would let 68.4 kg
 * become 68.40000000000001 on somebody's partner's phone.
 */
export interface SharedExtras {
  /** Most recent weight, in grams. */
  weightGrams: number | null;
  /** When that weight was recorded (epoch ms). */
  weightAt: number | null;
  /** Kicks counted in her most recent completed session. */
  kickCount: number | null;
  /** When that session was (epoch ms). */
  kickAt: number | null;
}

export const SHARED_EXTRA_FIELDS = [
  "weightGrams",
  "weightAt",
  "kickCount",
  "kickAt",
] as const satisfies readonly (keyof SharedExtras)[];

/**
 * Which fields each level unlocks.
 *
 * `fotos` claims nothing yet, deliberately. Photos do not leave the device at
 * all until K4 makes uploading them an explicit opt-in (ARCHITECTURE.md §4.4),
 * so there is no field for this level to carry and adding an empty column now
 * would be guessing at K4's shape. The level exists here so the owner's
 * preference is recorded and enforced from the day K4 has something to publish
 * — turning a stored "no" into an accident is exactly the failure this file is
 * arranged to prevent.
 */
export const LEVEL_FIELDS: Record<
  SharingLevel,
  readonly (keyof SharedExtras)[]
> = {
  peso: ["weightGrams", "weightAt"],
  pataditas: ["kickCount", "kickAt"],
  fotos: [],
};

/** Nothing shared. The starting point of every publish. */
export function emptyExtras(): SharedExtras {
  return {
    weightGrams: null,
    weightAt: null,
    kickCount: null,
    kickAt: null,
  };
}

/**
 * Only the pareja. Ever.
 *
 * The plan's wording is "the partner role only", and `family` is not a weaker
 * partner — it is a different relationship. Somebody's aunt does not get their
 * weight because the app could not think of a reason to stop her.
 */
export function canSeeSharingLevels(role: MemberRole): boolean {
  return role === "partner";
}

/**
 * Build the extras to publish: start from nothing, add only what is on.
 *
 * This is the whole guarantee, and it is a whitelist by construction rather
 * than a filter over something larger. `source` may be a fuller object than
 * `SharedExtras`; only the keys named in `LEVEL_FIELDS` are ever read out of it.
 */
export function applyLevels(
  preferences: SharingPreferences,
  source: SharedExtras,
): SharedExtras {
  const out = emptyExtras();
  for (const level of SHARING_LEVELS) {
    if (!preferences[level]) continue;
    for (const field of LEVEL_FIELDS[level]) {
      out[field] = source[field];
    }
  }
  return out;
}

/**
 * Read stored preferences back, defaulting every unknown answer to "off".
 *
 * The value arrives from an IndexedDB row that may predate this feature, may
 * have been restored from an old backup, or may have been round-tripped
 * through sync. Every one of those is a reason to fall back to not sharing.
 */
export function parsePreferences(value: unknown): SharingPreferences {
  const prefs = { ...SHARING_DEFAULTS };
  if (typeof value !== "object" || value === null) return prefs;
  const raw = value as Record<string, unknown>;
  for (const level of SHARING_LEVELS) {
    if (raw[level] === true) prefs[level] = true;
  }
  return prefs;
}

/**
 * Fields the opt-in tier must never carry, whatever an owner turns on.
 *
 * E1's `FORBIDDEN_COMPANION_FIELDS` bans weight outright, which was correct
 * when nothing could ever share it and is exactly what K3 changes — under an
 * explicit, per-field, partner-only opt-in. So the two lists are different on
 * purpose: this one drops `weight`/`kg` and keeps everything that stays
 * unshareable at any setting. Notes lead the list because they are the thing
 * with no sharing story at all.
 */
export const FORBIDDEN_SHARED_FIELDS = FORBIDDEN_COMPANION_FIELDS.filter(
  (field) => field !== "weight" && field !== "kg",
);
