import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import type { Database } from "./db";
import {
  companionCheers,
  companionSnapshots,
  companionTasks,
  invites,
  pregnancies,
  pregnancyMembers,
} from "./schema";
import type { MemberRole } from "@/lib/sharing/fields";

// BUILD-PLAN V2 — the storage half of family sharing.
//
// Same shape as A3's `SyncBackend` (`lib/server/sync.ts`) and for the same
// reason: `lib/server/sharing.ts` holds the decisions — who may read whose
// pregnancy, which fields a role is entitled to, what a second acceptance of an
// invite means — and those decisions were the only part of this app with no
// unit tests at all, because reaching them meant reaching MySQL. Everything
// below is the part that talks to the database; everything in `sharing.ts` is
// the part worth asserting, and `sharing.test.ts` runs it over a Map.
//
// **This file is the only place under `lib/server/` that queries the sharing
// tables.** `sharing.test.ts` asserts that as text, the way `admin.test.ts`
// asserts its own privacy scan — an "optimisation" that reaches around the
// interface would take the rules out of the tests without failing any of them.
//
// Two rules about what belongs here:
//
//   1. **No policy.** Nothing here checks a role or decides what a companion
//      may see. A backend method that took a `MemberRole` and returned
//      different data for different roles would be a rule hiding in the
//      storage layer, untested and duplicated in every future backend.
//
//   2. **`revokedAt IS NULL` is the exception, and it stays in the query.**
//      E1's promise is that revoking access is immediate rather than eventually
//      — there is no cache and no session copy of a role to go stale — and that
//      holds because a revoked membership is not *readable*, not because
//      something remembers to filter it afterwards. Applying it in `sharing.ts`
//      instead would move the one thing in this file that is load-bearing into
//      a place where a caller could forget it.

/** A membership as stored. Only ever handed out when it is live. */
export interface StoredMembership {
  pregnancyId: string;
  userId: string;
  role: MemberRole;
  /** K8 — the control this member said they would come to, if any. */
  accompanyingAt: number | null;
  createdAt: Date;
}

/** An invite as stored, with every field the acceptance rules look at. */
export interface StoredInvite {
  code: string;
  pregnancyId: string;
  role: MemberRole;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
  revokedAt: Date | null;
}

/**
 * A snapshot row, flags and all.
 *
 * The K3 flags travel with the values deliberately: `readSnapshotFor` re-applies
 * the levels from what is *stored*, so switching a level off takes effect even
 * if the owner's device never publishes again.
 */
export interface StoredSnapshot {
  pregnancyId: string;
  week: number | null;
  dueDate: number | null;
  nextAppointmentAt: number | null;
  babyName: string | null;
  updatedAt: number;
  sharePeso: boolean;
  sharePataditas: boolean;
  shareFotos: boolean;
  weightGrams: number | null;
  weightAt: number | null;
  kickCount: number | null;
  kickAt: number | null;
}

export interface StoredTask {
  itemKey: string;
  doneAt: number | null;
  updatedAt: number;
}

export interface StoredCheer {
  cheerId: string;
  createdAt: number;
  seenAt: number | null;
}

export interface SharingBackend {
  // -- pregnancies ----------------------------------------------------------
  /** The owner's pregnancy id, or null. */
  findPregnancyByOwner(ownerUserId: string): Promise<string | null>;
  /**
   * Create one. **Throws** when the owner already has a pregnancy — the unique
   * index is what settles the read-then-insert race (see schema.ts), so the
   * failure has to reach `ensurePregnancyForOwner` rather than be swallowed.
   */
  insertPregnancy(row: {
    id: string;
    ownerUserId: string;
    updatedAt: number;
  }): Promise<void>;
  /** Who owns it, for the cheer that needs somebody to poke. */
  findPregnancyOwner(pregnancyId: string): Promise<string | null>;

  // -- memberships ----------------------------------------------------------
  insertMembership(row: {
    id: string;
    pregnancyId: string;
    userId: string;
    role: MemberRole;
  }): Promise<void>;
  /**
   * Insert, or update the existing row for this (pregnancy, user).
   *
   * Re-accepting an invite un-revokes rather than failing on the unique index.
   */
  upsertMembership(row: {
    id: string;
    pregnancyId: string;
    userId: string;
    role: MemberRole;
  }): Promise<void>;
  /** This user's live membership of this pregnancy, or null. */
  liveMembership(
    userId: string,
    pregnancyId: string,
  ): Promise<StoredMembership | null>;
  /** Every live membership this user holds. */
  liveMembershipsOf(userId: string): Promise<StoredMembership[]>;
  /** Everyone who currently has access to this pregnancy, owner included. */
  liveMembersOf(pregnancyId: string): Promise<StoredMembership[]>;
  /** How many live NON-owner memberships remain. */
  liveNonOwnerCount(pregnancyId: string): Promise<number>;
  revokeMembership(
    pregnancyId: string,
    userId: string,
    at: Date,
  ): Promise<void>;
  /** K8. Scoped to a live membership, so a revoked one cannot be written through. */
  setAccompanyingIfLive(
    userId: string,
    pregnancyId: string,
    appointmentAt: number | null,
  ): Promise<void>;

  // -- invites --------------------------------------------------------------
  insertInvite(row: {
    code: string;
    pregnancyId: string;
    role: MemberRole;
    createdByUserId: string;
    expiresAt: Date;
  }): Promise<void>;
  findInvite(code: string): Promise<StoredInvite | null>;
  markInviteAccepted(code: string, userId: string, at: Date): Promise<void>;
  revokeInvite(pregnancyId: string, code: string, at: Date): Promise<void>;

  // -- the snapshot ---------------------------------------------------------
  upsertSnapshot(row: StoredSnapshot): Promise<void>;
  findSnapshot(pregnancyId: string): Promise<StoredSnapshot | null>;
  deleteSnapshot(pregnancyId: string): Promise<void>;

  // -- shared checklist items (K2) ------------------------------------------
  /** Assigning twice is the same assignment: `doneAt` is never reset. */
  upsertTask(row: {
    id: string;
    pregnancyId: string;
    itemKey: string;
    updatedAt: number;
  }): Promise<void>;
  deleteTask(pregnancyId: string, itemKey: string): Promise<void>;
  /** Scoped to (pregnancy, item): an unassigned key matches nothing. */
  setTaskDone(
    pregnancyId: string,
    itemKey: string,
    doneAt: number | null,
    updatedAt: number,
  ): Promise<void>;
  tasksOf(pregnancyId: string): Promise<StoredTask[]>;

  // -- ánimos (K2) ----------------------------------------------------------
  insertCheer(row: {
    id: string;
    pregnancyId: string;
    fromUserId: string;
    cheerId: string;
    createdAt: number;
  }): Promise<void>;
  /** Newest first, capped by the caller. */
  cheersOf(pregnancyId: string, limit: number): Promise<StoredCheer[]>;
  markCheersSeen(pregnancyId: string, seenAt: number): Promise<void>;
}

function toMembership(
  row: typeof pregnancyMembers.$inferSelect,
): StoredMembership {
  return {
    pregnancyId: row.pregnancyId,
    userId: row.userId,
    role: row.role,
    accompanyingAt: row.accompanyingAt,
    createdAt: row.createdAt,
  };
}

function toSnapshot(
  row: typeof companionSnapshots.$inferSelect,
): StoredSnapshot {
  return {
    pregnancyId: row.pregnancyId,
    week: row.week,
    dueDate: row.dueDate,
    nextAppointmentAt: row.nextAppointmentAt,
    babyName: row.babyName,
    updatedAt: row.updatedAt,
    sharePeso: row.sharePeso,
    sharePataditas: row.sharePataditas,
    shareFotos: row.shareFotos,
    weightGrams: row.weightGrams,
    weightAt: row.weightAt,
    kickCount: row.kickCount,
    kickAt: row.kickAt,
  };
}

/** The real thing. Constructed once per request in `app/api/v1/sharing/route.ts`. */
export function drizzleSharingBackend(database: Database): SharingBackend {
  return {
    async findPregnancyByOwner(ownerUserId) {
      const rows = await database
        .select({ id: pregnancies.id })
        .from(pregnancies)
        .where(eq(pregnancies.ownerUserId, ownerUserId))
        .limit(1);
      return rows[0]?.id ?? null;
    },

    async insertPregnancy(row) {
      await database.insert(pregnancies).values(row);
    },

    async findPregnancyOwner(pregnancyId) {
      const rows = await database
        .select({ ownerUserId: pregnancies.ownerUserId })
        .from(pregnancies)
        .where(eq(pregnancies.id, pregnancyId))
        .limit(1);
      return rows[0]?.ownerUserId ?? null;
    },

    async insertMembership(row) {
      await database.insert(pregnancyMembers).values(row);
    },

    async upsertMembership(row) {
      await database
        .insert(pregnancyMembers)
        .values(row)
        .onDuplicateKeyUpdate({
          set: { role: row.role, revokedAt: null },
        });
    },

    async liveMembership(userId, pregnancyId) {
      const rows = await database
        .select()
        .from(pregnancyMembers)
        .where(
          and(
            eq(pregnancyMembers.userId, userId),
            eq(pregnancyMembers.pregnancyId, pregnancyId),
            isNull(pregnancyMembers.revokedAt),
          ),
        )
        .limit(1);
      return rows[0] ? toMembership(rows[0]) : null;
    },

    async liveMembershipsOf(userId) {
      const rows = await database
        .select()
        .from(pregnancyMembers)
        .where(
          and(
            eq(pregnancyMembers.userId, userId),
            isNull(pregnancyMembers.revokedAt),
          ),
        );
      return rows.map(toMembership);
    },

    async liveMembersOf(pregnancyId) {
      const rows = await database
        .select()
        .from(pregnancyMembers)
        .where(
          and(
            eq(pregnancyMembers.pregnancyId, pregnancyId),
            isNull(pregnancyMembers.revokedAt),
          ),
        );
      return rows.map(toMembership);
    },

    async liveNonOwnerCount(pregnancyId) {
      // `ne(role, "owner")` in SQL would be one fewer row over the wire and one
      // more thing the memory backend has to imitate exactly. The count is of
      // companions, which is a handful; this keeps the two implementations
      // agreeing by construction.
      const rows = await database
        .select({ role: pregnancyMembers.role })
        .from(pregnancyMembers)
        .where(
          and(
            eq(pregnancyMembers.pregnancyId, pregnancyId),
            isNull(pregnancyMembers.revokedAt),
          ),
        );
      return rows.filter((row) => row.role !== "owner").length;
    },

    async revokeMembership(pregnancyId, userId, at) {
      await database
        .update(pregnancyMembers)
        .set({ revokedAt: at })
        .where(
          and(
            eq(pregnancyMembers.pregnancyId, pregnancyId),
            eq(pregnancyMembers.userId, userId),
          ),
        );
    },

    async setAccompanyingIfLive(userId, pregnancyId, appointmentAt) {
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
    },

    async insertInvite(row) {
      await database.insert(invites).values(row);
    },

    async findInvite(code) {
      const rows = await database
        .select()
        .from(invites)
        .where(eq(invites.code, code))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        code: row.code,
        pregnancyId: row.pregnancyId,
        role: row.role,
        expiresAt: row.expiresAt,
        acceptedAt: row.acceptedAt,
        acceptedByUserId: row.acceptedByUserId,
        revokedAt: row.revokedAt,
      };
    },

    async markInviteAccepted(code, userId, at) {
      await database
        .update(invites)
        .set({ acceptedAt: at, acceptedByUserId: userId })
        .where(eq(invites.code, code));
    },

    async revokeInvite(pregnancyId, code, at) {
      await database
        .update(invites)
        .set({ revokedAt: at })
        .where(
          and(eq(invites.code, code), eq(invites.pregnancyId, pregnancyId)),
        );
    },

    async upsertSnapshot(row) {
      await database
        .insert(companionSnapshots)
        .values(row)
        // A publish is a full overwrite of all seven K3 columns, so switching a
        // level off clears the data in the same write that records the flag.
        .onDuplicateKeyUpdate({
          set: {
            week: row.week,
            dueDate: row.dueDate,
            nextAppointmentAt: row.nextAppointmentAt,
            babyName: row.babyName,
            updatedAt: row.updatedAt,
            sharePeso: row.sharePeso,
            sharePataditas: row.sharePataditas,
            shareFotos: row.shareFotos,
            weightGrams: row.weightGrams,
            weightAt: row.weightAt,
            kickCount: row.kickCount,
            kickAt: row.kickAt,
          },
        });
    },

    async findSnapshot(pregnancyId) {
      const rows = await database
        .select()
        .from(companionSnapshots)
        .where(eq(companionSnapshots.pregnancyId, pregnancyId))
        .limit(1);
      return rows[0] ? toSnapshot(rows[0]) : null;
    },

    async deleteSnapshot(pregnancyId) {
      await database
        .delete(companionSnapshots)
        .where(eq(companionSnapshots.pregnancyId, pregnancyId));
    },

    async upsertTask(row) {
      await database
        .insert(companionTasks)
        .values({ ...row, doneAt: null })
        // `doneAt` is deliberately NOT reset — re-tapping "para tu pareja" on an
        // item he already did should not un-do his work.
        .onDuplicateKeyUpdate({ set: { updatedAt: row.updatedAt } });
    },

    async deleteTask(pregnancyId, itemKey) {
      await database
        .delete(companionTasks)
        .where(
          and(
            eq(companionTasks.pregnancyId, pregnancyId),
            eq(companionTasks.itemKey, itemKey),
          ),
        );
    },

    async setTaskDone(pregnancyId, itemKey, doneAt, updatedAt) {
      await database
        .update(companionTasks)
        .set({ doneAt, updatedAt })
        .where(
          and(
            eq(companionTasks.pregnancyId, pregnancyId),
            eq(companionTasks.itemKey, itemKey),
          ),
        );
    },

    async tasksOf(pregnancyId) {
      return database
        .select({
          itemKey: companionTasks.itemKey,
          doneAt: companionTasks.doneAt,
          updatedAt: companionTasks.updatedAt,
        })
        .from(companionTasks)
        .where(eq(companionTasks.pregnancyId, pregnancyId));
    },

    async insertCheer(row) {
      await database.insert(companionCheers).values({ ...row, seenAt: null });
    },

    async cheersOf(pregnancyId, limit) {
      return database
        .select({
          cheerId: companionCheers.cheerId,
          createdAt: companionCheers.createdAt,
          seenAt: companionCheers.seenAt,
        })
        .from(companionCheers)
        .where(eq(companionCheers.pregnancyId, pregnancyId))
        .orderBy(desc(companionCheers.createdAt))
        .limit(limit);
    },

    async markCheersSeen(pregnancyId, seenAt) {
      await database
        .update(companionCheers)
        .set({ seenAt })
        .where(
          and(
            eq(companionCheers.pregnancyId, pregnancyId),
            isNull(companionCheers.seenAt),
          ),
        );
    },
  };
}
