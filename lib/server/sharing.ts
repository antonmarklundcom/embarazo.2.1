import "server-only";

import { and, desc, eq, isNull, ne } from "drizzle-orm";

import type { Database } from "./db";
import {
  companionCheers,
  companionSnapshots,
  companionTasks,
  invites,
  pregnancies,
  pregnancyMembers,
} from "./schema";
import {
  INVITE_TTL_DAYS,
  canSeeSharedTasks,
  generateInviteCode,
  snapshotShouldBeDropped,
  type CompanionSnapshot,
  type MemberRole,
  type SharedTask,
} from "@/lib/sharing/fields";
import {
  applyLevels,
  canSeeSharingLevels,
  emptyExtras,
  type SharedExtras,
  type SharingPreferences,
} from "@/lib/sharing/levels";

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
  try {
    await database.insert(pregnancies).values({
      id,
      ownerUserId,
      updatedAt: now,
    });
  } catch (error) {
    // K14 — `pregnancies_owner_idx` is UNIQUE now (see lib/server/schema.ts),
    // so the loser of the read-then-insert race lands here instead of creating
    // a second pregnancy for the same owner. The winner's row is committed by
    // definition, so re-reading is the whole recovery: this call returns the
    // same id the winner returned, which is what the caller wanted either way.
    const raced = await database
      .select({ id: pregnancies.id })
      .from(pregnancies)
      .where(eq(pregnancies.ownerUserId, ownerUserId))
      .limit(1);
    if (raced[0]) return raced[0].id;
    // Not the race, then. A real failure the caller must see.
    throw error;
  }

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
  /** K8 — the control this member said they would come to, if any. */
  accompanyingAt?: number | null;
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
      // K8. A companion does not get the guest list (E1), so this is how they
      // learn their own answer — their row and nobody else's.
      accompanyingAt: pregnancyMembers.accompanyingAt,
    })
    .from(pregnancyMembers)
    .where(
      and(
        eq(pregnancyMembers.userId, userId),
        isNull(pregnancyMembers.revokedAt),
      ),
    );
}

/**
 * Revoke one membership, and drop the snapshot when the last companion goes.
 *
 * Revoking made the snapshot unreadable — every read goes through an active
 * membership — but left the row sitting there: week, due date, next control and
 * baby name for a pregnancy nobody is allowed to see. E1's own argument is that
 * "nothing else" is enforced by the data not existing rather than by a filter,
 * and a retained snapshot is that argument's one loose end. So when the last
 * non-owner membership is revoked, the row goes.
 *
 * The count is taken *after* the update, in the same call, so the decision is
 * made on the state the revocation produced rather than on the state before it.
 */
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

  const remaining = await database
    .select({ userId: pregnancyMembers.userId })
    .from(pregnancyMembers)
    .where(
      and(
        eq(pregnancyMembers.pregnancyId, pregnancyId),
        isNull(pregnancyMembers.revokedAt),
        ne(pregnancyMembers.role, "owner"),
      ),
    );

  if (snapshotShouldBeDropped(remaining.length)) {
    await database
      .delete(companionSnapshots)
      .where(eq(companionSnapshots.pregnancyId, pregnancyId));
  }
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

/**
 * Written by the owner's device only.
 *
 * K3: the extras are run through `applyLevels` **here as well as** on the
 * device. That is not belt-and-braces for its own sake — it means a client
 * that sends a weight with `peso: false` (an old build, a bug, a hand-rolled
 * request) stores a null rather than a value nobody agreed to share. The
 * publish is a full overwrite of all seven K3 columns, so switching a level off
 * clears the data in the same write that records the flag.
 */
export async function publishSnapshot(
  database: Database,
  pregnancyId: string,
  snapshot: CompanionSnapshot,
  preferences: SharingPreferences,
  extras: SharedExtras = emptyExtras(),
): Promise<void> {
  const shared = applyLevels(preferences, extras);

  const values = {
    pregnancyId,
    week: snapshot.week,
    dueDate: snapshot.dueDate,
    nextAppointmentAt: snapshot.nextAppointmentAt,
    babyName: snapshot.babyName,
    updatedAt: snapshot.updatedAt,
    sharePeso: preferences.peso,
    sharePataditas: preferences.pataditas,
    shareFotos: preferences.fotos,
    ...shared,
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
        sharePeso: values.sharePeso,
        sharePataditas: values.sharePataditas,
        shareFotos: values.shareFotos,
        weightGrams: values.weightGrams,
        weightAt: values.weightAt,
        kickCount: values.kickCount,
        kickAt: values.kickAt,
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
): Promise<{
  role: MemberRole;
  snapshot: CompanionSnapshot | null;
  extras: SharedExtras | null;
} | null> {
  const membership = await liveMembership(database, userId, pregnancyId);
  if (!membership) return null;

  const rows = await database
    .select()
    .from(companionSnapshots)
    .where(eq(companionSnapshots.pregnancyId, pregnancyId))
    .limit(1);

  const row = rows[0];
  if (!row) return { role: membership.role, snapshot: null, extras: null };

  return {
    role: membership.role,
    snapshot: {
      week: row.week,
      dueDate: row.dueDate,
      nextAppointmentAt: row.nextAppointmentAt,
      babyName: row.babyName,
      updatedAt: row.updatedAt,
    },
    // K3. Two independent gates, and the order matters for what each one
    // means: the ROLE gate is the rule ("the pareja only, ever"), the FLAG gate
    // is the owner's choice. Reading the stored flags rather than trusting the
    // stored values is what makes switching a level off take effect even if the
    // owner's device never publishes again.
    extras: canSeeSharingLevels(membership.role)
      ? applyLevels(
          {
            peso: row.sharePeso,
            pataditas: row.sharePataditas,
            fotos: row.shareFotos,
          },
          {
            weightGrams: row.weightGrams,
            weightAt: row.weightAt,
            kickCount: row.kickCount,
            kickAt: row.kickAt,
          },
        )
      : null,
  };
}

/**
 * K8 — "yo la acompaño" for one specific control.
 *
 * The caller must hold a live NON-owner membership: this is a companion saying
 * they will be there. `appointmentAt` is stored as given and compared later
 * against the control itself (`isAccompanying`), so a control that moves
 * invalidates the marker instead of silently reassigning it.
 */
export async function setAccompanying(
  database: Database,
  userId: string,
  pregnancyId: string,
  appointmentAt: number | null,
): Promise<boolean> {
  const membership = await liveMembership(database, userId, pregnancyId);
  if (!membership || membership.role === "owner") return false;

  await database
    .update(pregnancyMembers)
    .set({ accompanyingAt: appointmentAt })
    .where(
      and(
        eq(pregnancyMembers.pregnancyId, pregnancyId),
        eq(pregnancyMembers.userId, userId),
        isNull(pregnancyMembers.revokedAt),
      ),
    );
  return true;
}

/** Who currently has access, for the owner's "quién ve mi embarazo" screen. */
export async function membersOf(database: Database, pregnancyId: string) {
  return database
    .select({
      userId: pregnancyMembers.userId,
      role: pregnancyMembers.role,
      createdAt: pregnancyMembers.createdAt,
      // K8. The owner sees WHO is coming by role — "te acompaña tu pareja" —
      // and never a name: E1 never shared names between members and K8 does
      // not start.
      accompanyingAt: pregnancyMembers.accompanyingAt,
    })
    .from(pregnancyMembers)
    .where(
      and(
        eq(pregnancyMembers.pregnancyId, pregnancyId),
        isNull(pregnancyMembers.revokedAt),
      ),
    );
}

// ---------------------------------------------------------------------------
// Shared checklist items (K2)
// ---------------------------------------------------------------------------

/**
 * Every function below takes the caller's user id and resolves the membership
 * itself, exactly as `readSnapshotFor` does. There is deliberately no
 * "…ForPregnancy" variant that trusts a pregnancy id from a request body: the
 * membership check is the authorisation, and a helper that skips it is a helper
 * somebody will call.
 */

/** Assign a checklist item to the pareja. Owner only; idempotent. */
export async function assignTask(
  database: Database,
  pregnancyId: string,
  itemKey: string,
  now: number,
): Promise<void> {
  await database
    .insert(companionTasks)
    .values({
      id: crypto.randomUUID(),
      pregnancyId,
      itemKey,
      doneAt: null,
      updatedAt: now,
    })
    // Assigning twice is the same assignment. `updatedAt` moves so the
    // partner's next read is ordered sensibly; `doneAt` is deliberately NOT
    // reset — re-tapping "para tu pareja" on an item he already did should not
    // un-do his work.
    .onDuplicateKeyUpdate({ set: { updatedAt: now } });
}

/** Take an item back off the pareja's list. Owner only. */
export async function unassignTask(
  database: Database,
  pregnancyId: string,
  itemKey: string,
): Promise<void> {
  await database
    .delete(companionTasks)
    .where(
      and(
        eq(companionTasks.pregnancyId, pregnancyId),
        eq(companionTasks.itemKey, itemKey),
      ),
    );
}

/**
 * Tick or un-tick an assigned item.
 *
 * Only the pareja may do this, and only for an item that is already assigned:
 * the update is scoped to `(pregnancyId, itemKey)`, so a key that was never
 * assigned matches no row and silently changes nothing rather than creating an
 * assignment the owner never made.
 */
export async function setTaskDone(
  database: Database,
  pregnancyId: string,
  itemKey: string,
  done: boolean,
  now: number,
): Promise<void> {
  await database
    .update(companionTasks)
    .set({ doneAt: done ? now : null, updatedAt: now })
    .where(
      and(
        eq(companionTasks.pregnancyId, pregnancyId),
        eq(companionTasks.itemKey, itemKey),
      ),
    );
}

/**
 * The shared list, if the caller may see it.
 *
 * Returns `null` — not an empty list — when the caller is not a live member or
 * holds the `family` role. An empty array would say "there is nothing assigned"
 * to somebody who is not entitled to know either way.
 */
export async function readTasksFor(
  database: Database,
  userId: string,
  pregnancyId: string,
): Promise<SharedTask[] | null> {
  const membership = await liveMembership(database, userId, pregnancyId);
  if (!membership) return null;
  if (!canSeeSharedTasks(membership.role)) return null;

  const rows = await database
    .select({
      itemKey: companionTasks.itemKey,
      doneAt: companionTasks.doneAt,
      updatedAt: companionTasks.updatedAt,
    })
    .from(companionTasks)
    .where(eq(companionTasks.pregnancyId, pregnancyId));

  return rows.map((row) => ({
    itemKey: row.itemKey,
    doneAt: row.doneAt,
    updatedAt: row.updatedAt,
  }));
}

// ---------------------------------------------------------------------------
// Ánimos (K2)
// ---------------------------------------------------------------------------

/**
 * Send one cheer.
 *
 * The caller must hold a live NON-owner membership: this is a companion
 * cheering the pregnant user, and an owner cheering herself is not a thing the
 * product does. `cheerId` is validated against the pinned list at the API
 * boundary before it reaches here.
 */
export async function sendCheer(
  database: Database,
  userId: string,
  pregnancyId: string,
  cheerId: string,
  now: number,
): Promise<boolean> {
  const membership = await liveMembership(database, userId, pregnancyId);
  if (!membership || membership.role === "owner") return false;

  await database.insert(companionCheers).values({
    id: crypto.randomUUID(),
    pregnancyId,
    fromUserId: userId,
    cheerId,
    createdAt: now,
    seenAt: null,
  });
  return true;
}

export interface ReceivedCheer {
  cheerId: string;
  createdAt: number;
  seenAt: number | null;
}

/**
 * The cheers on the owner's own pregnancy.
 *
 * Owner only, by construction: this reads what people sent *her*, and a
 * companion has no business seeing who else in the family has been cheering.
 * Capped, because a home screen is not an inbox.
 */
export const CHEER_PAGE_SIZE = 50;

export async function readCheersFor(
  database: Database,
  userId: string,
  pregnancyId: string,
): Promise<ReceivedCheer[] | null> {
  const membership = await liveMembership(database, userId, pregnancyId);
  if (!membership || membership.role !== "owner") return null;

  const rows = await database
    .select({
      cheerId: companionCheers.cheerId,
      createdAt: companionCheers.createdAt,
      seenAt: companionCheers.seenAt,
    })
    .from(companionCheers)
    .where(eq(companionCheers.pregnancyId, pregnancyId))
    .orderBy(desc(companionCheers.createdAt))
    .limit(CHEER_PAGE_SIZE);

  return rows;
}

/** Mark everything on the owner's pregnancy as seen. Owner only. */
export async function markCheersSeen(
  database: Database,
  pregnancyId: string,
  now: number,
): Promise<void> {
  await database
    .update(companionCheers)
    .set({ seenAt: now })
    .where(
      and(
        eq(companionCheers.pregnancyId, pregnancyId),
        isNull(companionCheers.seenAt),
      ),
    );
}
