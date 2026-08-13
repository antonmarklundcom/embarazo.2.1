// BUILD-PLAN E1 — exactly what a non-owner may read.
//
// This file is the whitelist, and it is deliberately a *shape* rather than a
// filter applied to something larger. The companion view cannot read the
// owner's records at all: `syncRecords.payload` is opaque to the server
// (§4.3), and even if it were not, "show everything except notes and photos"
// is a rule that fails open the first time somebody adds a field.
//
// Instead the owner's device publishes a snapshot containing these fields and
// nothing else, and that snapshot is the only thing a partner or a family
// member can ever fetch. Adding a field to a companion view means adding it
// here, on purpose, in a diff someone reviews.

export const MEMBER_ROLES = ["owner", "partner", "family"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/**
 * What each role can do, in v1.
 *
 * `partner` and `family` have identical permissions today — the distinction is
 * how the app addresses them (B1's role copy), not what they can see. They are
 * separate values now so that giving a partner something extra later (E2's
 * shared bump photos, say) is a permission change rather than a migration.
 */
export function canWrite(role: MemberRole): boolean {
  return role === "owner";
}

export function canReadCompanionView(role: MemberRole): boolean {
  return MEMBER_ROLES.includes(role);
}

/**
 * The complete set of fields a non-owner may see. The task's "done when" is
 * "an invited partner sees the week, due date and next appointment and nothing
 * else", and this is that sentence written as a type.
 */
export interface CompanionSnapshot {
  /** Friendly 1-based week (see DECISIONS.md B3 — NOT completed weeks). */
  week: number | null;
  /** Epoch ms. */
  dueDate: number | null;
  /** Epoch ms of the next prenatal control, if the owner set one. */
  nextAppointmentAt: number | null;
  /** The baby's nickname, if the owner gave one (B2). */
  babyName: string | null;
  /** When the owner's device last published this. */
  updatedAt: number;
}

export const COMPANION_FIELDS = [
  "week",
  "dueDate",
  "nextAppointmentAt",
  "babyName",
  "updatedAt",
] as const satisfies readonly (keyof CompanionSnapshot)[];

/**
 * Fields that must NEVER appear in a snapshot, asserted by test.
 *
 * Journal notes and photos are named in the task; the rest are here because
 * they are the plausible next additions, and the point of this list is to make
 * adding one a conscious act rather than an accident.
 */
export const FORBIDDEN_COMPANION_FIELDS = [
  "note",
  "notes",
  "symptoms",
  "mood",
  "photo",
  "photos",
  "blob",
  "weight",
  "kg",
  "bloodType",
  "allergies",
  "clinical",
  "cycles",
] as const;

/**
 * Build a snapshot from the owner's local data.
 *
 * Takes plain values rather than a Dexie row so it stays pure and so a caller
 * cannot accidentally spread a whole profile into it.
 */
export function buildSnapshot(input: {
  week: number | null;
  dueDate: number | null;
  nextAppointmentAt: number | null;
  babyName: string | null;
  now: number;
}): CompanionSnapshot {
  return {
    week: input.week,
    dueDate: input.dueDate,
    nextAppointmentAt: input.nextAppointmentAt,
    // An empty string is not a name; store null so the companion view falls
    // back to "tu bebé" rather than rendering a blank.
    babyName: input.babyName?.trim() ? input.babyName.trim() : null,
    updatedAt: input.now,
  };
}

/**
 * A membership is live only if it exists and has not been revoked.
 *
 * Evaluated on every read rather than cached anywhere, which is what makes
 * "revoking access is immediate" true instead of eventually true.
 */
export function isLiveMembership(membership: {
  revokedAt?: Date | number | null;
}): boolean {
  return !membership.revokedAt;
}

/** Invite codes: short enough to read aloud, long enough not to guess. */
export const INVITE_CODE_LENGTH = 10;
/** No 0/O/1/I/L — these get read over the phone and written down wrong. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(
  random: (max: number) => number = (max) =>
    Math.floor((crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32) * max),
): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  }
  return code;
}

export function isValidInviteCode(value: string): boolean {
  if (value.length !== INVITE_CODE_LENGTH) return false;
  return [...value].every((char) => CODE_ALPHABET.includes(char));
}

/** Invites expire; a link in a WhatsApp thread should not work forever. */
export const INVITE_TTL_DAYS = 14;

// ---------------------------------------------------------------------------
// Snapshot lifetime (August 2026 review follow-up)
// ---------------------------------------------------------------------------

/**
 * Whether the companion snapshot should be deleted after a revocation.
 *
 * E1's whole argument is that "a companion sees nothing else" holds because the
 * data a companion could see does not exist anywhere else — not because a
 * filter hides it. A snapshot left behind after the last companion is revoked
 * is that argument's loose end: unreadable today, and one future bug away from
 * being readable. `pregnancyId` is the primary key of `companionSnapshots`, so
 * a re-invited companion simply causes the owner's device to publish it again.
 *
 * Owners are not counted: an owner's membership is not what the snapshot is
 * for, and a pregnancy always has one.
 */
export function snapshotShouldBeDropped(activeNonOwnerMemberships: number): boolean {
  return activeNonOwnerMemberships === 0;
}
