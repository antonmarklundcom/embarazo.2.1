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

import { CHECKLISTS } from "@/lib/checklists";

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
 * K2 gave `partner` its first power `family` does not have.
 *
 * Shared checklist items are addressed to the person who is going to the
 * sanatorio, packing the bag and doing the trámites — that is the pareja, not
 * the aunt who wants to see the week. E1 kept the two roles separate precisely
 * so this could be a permission change rather than a migration; this is that
 * change, and it is a function rather than a `role === "partner"` scattered
 * through the UI and the route.
 */
export function canSeeSharedTasks(role: MemberRole): boolean {
  return role === "owner" || role === "partner";
}

/** Only the pareja can tick one off. The owner assigns; the owner is not the doer. */
export function canCompleteSharedTask(role: MemberRole): boolean {
  return role === "partner";
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

// ---------------------------------------------------------------------------
// Shared checklist items (K2)
// ---------------------------------------------------------------------------

/**
 * The keys an owner may assign to her pareja — every item in the app's own
 * checklists (`lib/checklists.ts`) and nothing else.
 *
 * This is the same argument as the snapshot: **a shape, not a filter.** The
 * server stores a key from this list and never a label, so no prose an owner
 * types can reach `companionTasks`, and the words the partner reads are
 * rendered from the seed on their own device. A key that is not in this list is
 * rejected at the boundary rather than stored and hidden later.
 */
export const SHARED_TASK_KEYS: readonly string[] = CHECKLISTS.flatMap((group) =>
  group.items.map((item) => item.key),
);

export function isSharedTaskKey(value: unknown): value is string {
  return typeof value === "string" && SHARED_TASK_KEYS.includes(value);
}

/** One assigned item, as a companion or the owner reads it. */
export interface SharedTask {
  itemKey: string;
  /** Epoch ms when the pareja ticked it, or null. */
  doneAt: number | null;
  updatedAt: number;
}

/**
 * Fields a shared task must never carry, asserted by test alongside the
 * snapshot's own list. A task is an id and a timestamp; the moment one grows a
 * "nota para tu pareja" it becomes the free-text channel K2 refused to build.
 */
export const FORBIDDEN_TASK_FIELDS = [
  "note",
  "notes",
  "label",
  "text",
  "message",
  "comment",
] as const;

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
