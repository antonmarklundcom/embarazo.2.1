import "server-only";

import { and, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";

import type { Database } from "./db";
import {
  pregnancies,
  pregnancyMembers,
  pushSubscriptions,
  syncRecords,
  users,
} from "./schema";

// BUILD-PLAN I1 / U6, W5 — the storage half of the support console.
//
// Same cut as V2's `sharingBackend.ts`: `support.ts` holds the decisions —
// which repair does what, and the A7 privacy limit that nothing here may
// return a record's body — and this file holds every query. `support.test.ts`
// runs the real `support.ts` over a Map.
//
// **No policy.** Nothing here decides what an administrator may see; it
// returns rows and counts, exactly what it was asked for. The one thing that
// stays in the query rather than being filtered afterwards is `isNull(
// revokedAt)` where E1's "immediate" promise depends on it — the same
// discipline `sharingBackend.ts` documents for the same reason.

export interface SupportMembershipRow {
  id: string;
  pregnancyId: string;
  memberUserId: string;
  memberEmail: string | null;
  role: string;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface SupportDeviceRow {
  id: string;
  endpoint: string;
  createdAt: Date;
  lastSeenAt: Date | null;
}

export interface SupportTombstoneRow {
  store: string;
  recordId: string;
  deletedAt: number;
}

export interface SupportBackend {
  /** Pregnancy ids this user owns. */
  ownedPregnancyIds(userId: string): Promise<string[]>;
  /** Every membership row on either side of this user's relationships. */
  membershipRows(
    userId: string,
    ownedPregnancyIds: string[],
  ): Promise<SupportMembershipRow[]>;
  findMembership(
    membershipId: string,
  ): Promise<{ id: string; pregnancyId: string; memberUserId: string } | null>;
  /** Scoped to a live membership: revoking twice changes no rows. */
  revokeMembershipIfLive(membershipId: string, at: Date): Promise<void>;

  devicesOf(userId: string): Promise<SupportDeviceRow[]>;
  findDevice(userId: string, subscriptionId: string): Promise<{ id: string } | null>;
  deleteDevice(subscriptionId: string): Promise<void>;

  bumpSessionVersion(userId: string): Promise<void>;
  bumpSyncEpoch(userId: string): Promise<void>;
  syncState(
    userId: string,
  ): Promise<{ sessionVersion: number; syncEpoch: number } | null>;

  tombstonesSince(userId: string, since: number): Promise<SupportTombstoneRow[]>;
  /** True when a live tombstone for this record exists. */
  hasTombstone(userId: string, store: string, recordId: string): Promise<boolean>;
  restoreTombstone(
    userId: string,
    store: string,
    recordId: string,
    now: number,
  ): Promise<void>;
}

/** The real thing. Constructed once per request. */
export function drizzleSupportBackend(database: Database): SupportBackend {
  return {
    async ownedPregnancyIds(userId) {
      const owned = await database
        .select({ id: pregnancies.id })
        .from(pregnancies)
        .where(eq(pregnancies.ownerUserId, userId));
      return owned.map((row) => row.id);
    },

    async membershipRows(userId, ownedPregnancyIds) {
      return database
        .select({
          id: pregnancyMembers.id,
          pregnancyId: pregnancyMembers.pregnancyId,
          memberUserId: pregnancyMembers.userId,
          role: pregnancyMembers.role,
          createdAt: pregnancyMembers.createdAt,
          revokedAt: pregnancyMembers.revokedAt,
          memberEmail: users.email,
        })
        .from(pregnancyMembers)
        .leftJoin(users, eq(users.id, pregnancyMembers.userId))
        .where(
          ownedPregnancyIds.length > 0
            ? sql`${pregnancyMembers.userId} = ${userId} or ${pregnancyMembers.pregnancyId} in ${ownedPregnancyIds}`
            : eq(pregnancyMembers.userId, userId),
        )
        .orderBy(desc(pregnancyMembers.createdAt))
        .limit(50);
    },

    async findMembership(membershipId) {
      const [row] = await database
        .select({
          id: pregnancyMembers.id,
          pregnancyId: pregnancyMembers.pregnancyId,
          memberUserId: pregnancyMembers.userId,
        })
        .from(pregnancyMembers)
        .where(eq(pregnancyMembers.id, membershipId))
        .limit(1);
      return row ?? null;
    },

    async revokeMembershipIfLive(membershipId, at) {
      await database
        .update(pregnancyMembers)
        .set({ revokedAt: at })
        .where(
          and(
            eq(pregnancyMembers.id, membershipId),
            isNull(pregnancyMembers.revokedAt),
          ),
        );
    },

    async devicesOf(userId) {
      return database
        .select({
          id: pushSubscriptions.id,
          endpoint: pushSubscriptions.endpoint,
          createdAt: pushSubscriptions.createdAt,
          lastSeenAt: pushSubscriptions.lastSeenAt,
        })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId))
        .orderBy(desc(pushSubscriptions.createdAt))
        .limit(25);
    },

    async findDevice(userId, subscriptionId) {
      const [row] = await database
        .select({ id: pushSubscriptions.id })
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.id, subscriptionId),
            // Scoped to the user whose page this is: a subscription id from
            // another account must not be removable from this screen.
            eq(pushSubscriptions.userId, userId),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    async deleteDevice(subscriptionId) {
      await database
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.id, subscriptionId));
    },

    async bumpSessionVersion(userId) {
      await database
        .update(users)
        .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
        .where(eq(users.id, userId));
    },

    async bumpSyncEpoch(userId) {
      await database
        .update(users)
        .set({ syncEpoch: sql`${users.syncEpoch} + 1` })
        .where(eq(users.id, userId));
    },

    async syncState(userId) {
      const [row] = await database
        .select({
          sessionVersion: users.sessionVersion,
          syncEpoch: users.syncEpoch,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return row ?? null;
    },

    async tombstonesSince(userId, since) {
      const rows = await database
        .select({
          store: syncRecords.store,
          recordId: syncRecords.recordId,
          deletedAt: syncRecords.deletedAt,
        })
        .from(syncRecords)
        .where(
          and(
            eq(syncRecords.userId, userId),
            isNotNull(syncRecords.deletedAt),
            gte(syncRecords.deletedAt, since),
          ),
        )
        .orderBy(desc(syncRecords.deletedAt))
        .limit(100);

      return rows
        .filter((row): row is typeof row & { deletedAt: number } => row.deletedAt !== null)
        .map((row) => ({ store: row.store, recordId: row.recordId, deletedAt: row.deletedAt }));
    },

    async hasTombstone(userId, store, recordId) {
      const [row] = await database
        .select({ recordId: syncRecords.recordId })
        .from(syncRecords)
        .where(
          and(
            eq(syncRecords.userId, userId),
            eq(syncRecords.store, store as never),
            eq(syncRecords.recordId, recordId),
            isNotNull(syncRecords.deletedAt),
          ),
        )
        .limit(1);
      return row !== undefined;
    },

    async restoreTombstone(userId, store, recordId, now) {
      await database
        .update(syncRecords)
        .set({ deletedAt: null, updatedAt: now, serverUpdatedAt: now })
        .where(
          and(
            eq(syncRecords.userId, userId),
            eq(syncRecords.store, store as never),
            eq(syncRecords.recordId, recordId),
          ),
        );
    },
  };
}
