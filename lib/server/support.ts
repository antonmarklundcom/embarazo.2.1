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

// BUILD-PLAN I1 / U6 — the three support tickets that actually arrive.
//
// A7 built the floor: find an account, see its state, delete it, repair an
// invite. What it could not do is any of the three things support is actually
// asked for, each of which still meant opening a MySQL client:
//
//   1. "Sacá a mi ex del embarazo"  → revoke a membership
//   2. "No puedo entrar" / a stolen phone → drop a device, end every session
//   3. "Perdí mis datos" → force a resync, restore a deleted record
//
// **The A7 privacy limit is unchanged and this module is held to it.** It is
// on `admin.test.ts`'s scanned list from the day it was written, alongside
// `adminMetrics.ts` and the rest, so the same assertions apply: nothing here
// may name a record's body, a photo object or a companion's shared values.
// Every query below returns ids, categories, counts and timestamps.
//
// Two things are worth stating out loud because they are easy to get wrong:
//
// **A push endpoint is a bearer secret.** Anybody holding the endpoint URL can
// send that phone a notification. The panel therefore never renders it — it
// renders the HOST (`fcm.googleapis.com`), which is enough for an
// administrator to say "your Chrome install" and useless to anybody who reads
// it over a shoulder. `deviceHost` does that extraction here rather than in the
// page, so there is no way to render a device without it going through this.
//
// **A tombstone is listed, never read.** The restore action clears `deletedAt`;
// it does not, and cannot, look at what the record said.

/** How far back the panel offers to restore. A display filter — nothing purges. */
export const RESTORE_WINDOW_DAYS = 30;

// ---------------------------------------------------------------------------
// 1. Family members
// ---------------------------------------------------------------------------

export interface SupportMembership {
  id: string;
  pregnancyId: string;
  memberUserId: string;
  /** The member's own email, so an administrator can name who is being cut. */
  memberEmail: string | null;
  role: string;
  createdAt: Date;
  revokedAt: Date | null;
  /** True when this is a membership OF a pregnancy this user owns. */
  ownedByThisUser: boolean;
}

/**
 * Everyone who can see this user's pregnancies, plus the pregnancies this user
 * can see of somebody else's.
 *
 * Both directions, because both are real tickets: "sacá a mi ex del embarazo"
 * is the first, and "I do not want to see my sister's pregnancy any more" is
 * the second, and an administrator looking at one account should not have to
 * work out which side of the relationship they are on.
 */
export async function membershipsAround(
  database: Database,
  userId: string,
): Promise<SupportMembership[]> {
  const owned = await database
    .select({ id: pregnancies.id })
    .from(pregnancies)
    .where(eq(pregnancies.ownerUserId, userId));
  const ownedIds = owned.map((row) => row.id);

  const rows = await database
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
      ownedIds.length > 0
        ? sql`${pregnancyMembers.userId} = ${userId} or ${pregnancyMembers.pregnancyId} in ${ownedIds}`
        : eq(pregnancyMembers.userId, userId),
    )
    .orderBy(desc(pregnancyMembers.createdAt))
    .limit(50);

  const ownedSet = new Set(ownedIds);
  return rows.map((row) => ({
    ...row,
    ownedByThisUser: ownedSet.has(row.pregnancyId),
  }));
}

/**
 * Cut a member off. E1 makes this immediate: `isNull(revokedAt)` is inside the
 * membership query rather than applied after it, and no role is cached in a
 * session or a token, so there is nothing to expire.
 *
 * Idempotent — a second click on an already-revoked membership changes no rows
 * and is not an error. Support double-clicks.
 */
export async function revokeMembership(
  database: Database,
  membershipId: string,
): Promise<{ pregnancyId: string; memberUserId: string } | null> {
  const [row] = await database
    .select({
      id: pregnancyMembers.id,
      pregnancyId: pregnancyMembers.pregnancyId,
      memberUserId: pregnancyMembers.userId,
    })
    .from(pregnancyMembers)
    .where(eq(pregnancyMembers.id, membershipId))
    .limit(1);
  if (!row) return null;

  await database
    .update(pregnancyMembers)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(pregnancyMembers.id, membershipId),
        isNull(pregnancyMembers.revokedAt),
      ),
    );

  return { pregnancyId: row.pregnancyId, memberUserId: row.memberUserId };
}

// ---------------------------------------------------------------------------
// 2. Devices and sessions
// ---------------------------------------------------------------------------

export interface SupportDevice {
  id: string;
  /** The endpoint's HOST only. The URL itself is a bearer secret. */
  host: string;
  createdAt: Date;
  lastSeenAt: Date | null;
}

/**
 * The host of a push endpoint, or a safe placeholder.
 *
 * `new URL()` throws on anything malformed, and a stored endpoint is data we
 * did not write, so the failure lands here rather than on the page.
 */
export function deviceHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "desconocido";
  }
}

export async function devicesOf(
  database: Database,
  userId: string,
): Promise<SupportDevice[]> {
  const rows = await database
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

  // The endpoint is dropped here, before the value leaves this function, so a
  // caller cannot render one by accident.
  return rows.map((row) => ({
    id: row.id,
    host: deviceHost(row.endpoint),
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
  }));
}

/** Forget one device. It stops receiving pokes immediately. */
export async function removeDevice(
  database: Database,
  userId: string,
  subscriptionId: string,
): Promise<boolean> {
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
  if (!row) return false;

  await database
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.id, subscriptionId));
  return true;
}

/**
 * End every session this account has open, everywhere.
 *
 * Sessions are JWTs (ARCHITECTURE.md §6) — there is no session table to delete
 * from, which is the trade that keeps every page render a cookie read instead
 * of a database round-trip. Bumping `sessionVersion` is how that strategy
 * revokes: the version is stamped into the token at sign-in and compared on
 * every request, so a token issued before the bump stops resolving to a user.
 *
 * The signed-out phone can sign back in immediately. That is correct — this is
 * for a stolen handset, and the woman whose handset it was still knows her
 * password.
 */
export async function revokeAllSessions(
  database: Database,
  userId: string,
): Promise<void> {
  await database
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// 3. Lost data
// ---------------------------------------------------------------------------

/**
 * Tell every one of this account's devices to pull everything again.
 *
 * The epoch rides on each sync response; a device seeing a new one resets its
 * cursor to 0. Last-write-wins makes that idempotent — a full re-pull cannot
 * overwrite anything newer, because every record is still compared on its own
 * `updatedAt` — so this is safe to press twice and safe to press on a healthy
 * account, which matters when it is being pressed by somebody on the phone to
 * a worried user.
 */
export async function forceResync(
  database: Database,
  userId: string,
): Promise<void> {
  await database
    .update(users)
    .set({ syncEpoch: sql`${users.syncEpoch} + 1` })
    .where(eq(users.id, userId));
}

/** The current epoch and session version, read together on sign-in and sync. */
export async function userSyncState(
  database: Database,
  userId: string,
): Promise<{ sessionVersion: number; syncEpoch: number } | null> {
  const [row] = await database
    .select({
      sessionVersion: users.sessionVersion,
      syncEpoch: users.syncEpoch,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

export interface SupportTombstone {
  store: string;
  recordId: string;
  deletedAt: number;
}

/**
 * Records this account deleted recently.
 *
 * `store` and `recordId` and a date. There is deliberately no fourth column:
 * the panel can say "you deleted 3 registros de peso on Tuesday", and it
 * cannot say what any of them weighed.
 *
 * The 30-day window is a display filter, not a retention rule — nothing purges
 * tombstones, so a longer window is a one-line change if support ever needs
 * one. It exists so the list is the records somebody is actually asking about
 * rather than every delete since they installed the app.
 */
export async function recentTombstones(
  database: Database,
  userId: string,
  now: number,
): Promise<SupportTombstone[]> {
  const since = now - RESTORE_WINDOW_DAYS * 86_400_000;
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
    .map((row) => ({
      store: row.store,
      recordId: row.recordId,
      deletedAt: row.deletedAt,
    }));
}

/**
 * Un-delete one record.
 *
 * Both clocks move to now: `updatedAt` so every device's last-write-wins
 * accepts the restore over the delete it already applied, and `serverUpdatedAt`
 * so the pull cursor picks the row up on the next sync rather than leaving it
 * behind at its original position.
 *
 * **What this can and cannot give back**, because the difference matters and
 * the screen says so too. A delete drops the body — `toPayload` returns null
 * for a deleted row (lib/sync/merge.ts), by design, so that the server does not
 * hold the contents of something the user just deleted. So the row this
 * restores carries no payload, and the record comes back only on a device that
 * still has the body locally. `applyPayload` is what makes that safe rather
 * than destructive: a live record arriving with a null payload never blanks a
 * body a device already holds, and is not applied at all on a device with
 * nothing to restore. Without that rule this function would win every LWW
 * comparison with an empty record and wipe the very data it is meant to
 * recover — see the unit tests in `lib/sync/merge.test.ts`.
 */
export async function restoreRecord(
  database: Database,
  userId: string,
  store: string,
  recordId: string,
  now: number,
): Promise<boolean> {
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
  if (!row) return false;

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
  return true;
}
