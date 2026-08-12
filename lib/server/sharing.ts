import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import type { Database } from "./db";
import {
  companionSnapshots,
  invites,
  pregnancies,
  pregnancyMembers,
} from "./schema";
import {
  INVITE_TTL_DAYS,
  generateInviteCode,
  type CompanionSnapshot,
  type MemberRole,
} from "@/lib/sharing/fields";

// BUILD-PLAN E1 — family sharing, server half.
//
// The rule that shapes everything here: a non-owner can read
// `companionSnapshots` and nothing else. There is no code path in this file
// from a membership to `syncRecords`, and that is not an oversight to be fixed
// later — it is the feature (see the table's comment in schema.ts).

/** A pregnancy row for the owner, created on demand. */
export async function ensurePregnancyForOwner(
  database: Database,
  ownerUserId: string,
  now: number,
): Promise<string> {
  const existing = await database
    .select({ id: pregnancies.id })
    .from(pregnancies)
    .where(eq(pregnancies.ownerUserId, ownerUserId))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const id = crypto.randomUUID();
  await database.insert(pregnancies).values({
    id,
    ownerUserId,
    updatedAt: now,
  });
  // The owner is a member of their own pregnancy. Without this row, "who can
  // see this" has to special-case the owner in every query that asks.
  await database.insert(pregnancyMembers).values({
    id: crypto.randomUUID(),
    pregnancyId: id,
    userId: ownerUserId,
    role: "owner",
  });
  return id;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export interface Membership {
  pregnancyId: string;
  role: MemberRole;
}

/**
 * The caller's live membership of a pregnancy, or null.
 *
 * `isNull(revokedAt)` is in the query, not applied afterwards, so a revoked
 * membership cannot be read at all. That is what makes "revoking access is
 * immediate" true rather than eventually true — there is no cache and no
 * session copy of the role to go stale.
 */
export async function liveMembership(
  database: Database,
  userId: string,
  pregnancyId: string,
): Promise<Membership | null> {
  const rows = await database
    .select({
      pregnancyId: pregnancyMembers.pregnancyId,
      role: pregnancyMembers.role,
    })
    .from(pregnancyMembers)
    .where(
      and(
        eq(pregnancyMembers.userId, userId),
        eq(pregnancyMembers.pregnancyId, pregnancyId),
        isNull(pregnancyMembers.revokedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Every pregnancy this user can currently see, owned or shared. */
export async function membershipsOf(
  database: Database,
  userId: string,
): Promise<Membership[]> {
  return database
    .select({
      pregnancyId: pregnancyMembers.pregnancyId,
      role: pregnancyMembers.role,
    })
    .from(pregnancyMembers)
    .where(
      and(
        eq(pregnancyMembers.userId, userId),
        isNull(pregnancyMembers.revokedAt),
      ),
    );
}

export async function revokeMembership(
  database: Database,
  pregnancyId: string,
  userId: string,
): Promise<void> {
  await database
    .update(pregnancyMembers)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(pregnancyMembers.pregnancyId, pregnancyId),
        eq(pregnancyMembers.userId, userId),
      ),
    );
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export interface CreatedInvite {
  code: string;
  role: MemberRole;
  expiresAt: Date;
}

export async function createInvite(
  database: Database,
  pregnancyId: string,
  createdByUserId: string,
  role: Exclude<MemberRole, "owner">,
  now: number,
): Promise<CreatedInvite> {
  const code = generateInviteCode();
  const expiresAt = new Date(now + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await database.insert(invites).values({
    code,
    pregnancyId,
    role,
    createdByUserId,
    expiresAt,
  });

  return { code, role, expiresAt };
}

export type AcceptOutcome =
  | { ok: true; pregnancyId: string; role: MemberRole }
  | { ok: false; reason: "not-found" | "expired" | "revoked" | "used" };

/**
 * Accept an invite.
 *
 * A code is single-use: once accepted it is stamped, so a link forwarded on
 * from a WhatsApp group does not let a second person in. That matters more
 * here than the usual convenience argument — the thing behind the link is
 * somebody's pregnancy.
 */
export async function acceptInvite(
  database: Database,
  code: string,
  userId: string,
  now: number,
): Promise<AcceptOutcome> {
  const rows = await database
    .select()
    .from(invites)
    .where(eq(invites.code, code))
    .limit(1);

  const invite = rows[0];
  if (!invite) return { ok: false, reason: "not-found" };
  if (invite.revokedAt) return { ok: false, reason: "revoked" };
  if (invite.acceptedAt && invite.acceptedByUserId !== userId) {
    return { ok: false, reason: "used" };
  }
  if (invite.expiresAt.getTime() < now) return { ok: false, reason: "expired" };

  await database
    .insert(pregnancyMembers)
    .values({
      id: crypto.randomUUID(),
      pregnancyId: invite.pregnancyId,
      userId,
      role: invite.role,
    })
    // Re-accepting an invite the user already used un-revokes them rather than
    // failing on the unique index.
    .onDuplicateKeyUpdate({
      set: { role: invite.role, revokedAt: null },
    });

  await database
    .update(invites)
    .set({ acceptedAt: new Date(now), acceptedByUserId: userId })
    .where(eq(invites.code, code));

  return { ok: true, pregnancyId: invite.pregnancyId, role: invite.role };
}

export async function revokeInviteCode(
  database: Database,
  pregnancyId: string,
  code: string,
): Promise<void> {
  await database
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(and(eq(invites.code, code), eq(invites.pregnancyId, pregnancyId)));
}

// ---------------------------------------------------------------------------
// The snapshot
// ---------------------------------------------------------------------------

/** Written by the owner's device only. */
export async function publishSnapshot(
  database: Database,
  pregnancyId: string,
  snapshot: CompanionSnapshot,
): Promise<void> {
  const values = {
    pregnancyId,
    week: snapshot.week,
    dueDate: snapshot.dueDate,
    nextAppointmentAt: snapshot.nextAppointmentAt,
    babyName: snapshot.babyName,
    updatedAt: snapshot.updatedAt,
  };

  await database
    .insert(companionSnapshots)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        week: values.week,
        dueDate: values.dueDate,
        nextAppointmentAt: values.nextAppointmentAt,
        babyName: values.babyName,
        updatedAt: values.updatedAt,
      },
    });
}

/**
 * Read the snapshot, if the caller is still a member.
 *
 * The membership check is inside this function rather than at the call site,
 * so there is no way to read a snapshot without it.
 */
export async function readSnapshotFor(
  database: Database,
  userId: string,
  pregnancyId: string,
): Promise<{ role: MemberRole; snapshot: CompanionSnapshot | null } | null> {
  const membership = await liveMembership(database, userId, pregnancyId);
  if (!membership) return null;

  const rows = await database
    .select()
    .from(companionSnapshots)
    .where(eq(companionSnapshots.pregnancyId, pregnancyId))
    .limit(1);

  const row = rows[0];
  return {
    role: membership.role,
    snapshot: row
      ? {
          week: row.week,
          dueDate: row.dueDate,
          nextAppointmentAt: row.nextAppointmentAt,
          babyName: row.babyName,
          updatedAt: row.updatedAt,
        }
      : null,
  };
}

/** Who currently has access, for the owner's "quién ve mi embarazo" screen. */
export async function membersOf(database: Database, pregnancyId: string) {
  return database
    .select({
      userId: pregnancyMembers.userId,
      role: pregnancyMembers.role,
      createdAt: pregnancyMembers.createdAt,
    })
    .from(pregnancyMembers)
    .where(
      and(
        eq(pregnancyMembers.pregnancyId, pregnancyId),
        isNull(pregnancyMembers.revokedAt),
      ),
    );
}
