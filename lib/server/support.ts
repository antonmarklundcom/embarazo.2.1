import "server-only";

import type { SupportBackend } from "./supportBackend";

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
// W5: every function below takes a `SupportBackend` (`lib/server/
// supportBackend.ts`) rather than a `Database`, the same cut V2 gave
// `sharing.ts`. `support.test.ts` runs these functions, unchanged, over a Map.
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
  backend: SupportBackend,
  userId: string,
): Promise<SupportMembership[]> {
  const ownedIds = await backend.ownedPregnancyIds(userId);
  const rows = await backend.membershipRows(userId, ownedIds);

  const ownedSet = new Set(ownedIds);
  return rows.map((row) => ({
    ...row,
    ownedByThisUser: ownedSet.has(row.pregnancyId),
  }));
}

/**
 * Cut a member off. E1 makes this immediate: the backend scopes the write to
 * a live membership rather than filtering afterwards, and no role is cached in
 * a session or a token, so there is nothing to expire.
 *
 * Idempotent — a second click on an already-revoked membership changes no rows
 * and is not an error. Support double-clicks.
 */
export async function revokeMembership(
  backend: SupportBackend,
  membershipId: string,
): Promise<{ pregnancyId: string; memberUserId: string } | null> {
  const row = await backend.findMembership(membershipId);
  if (!row) return null;

  await backend.revokeMembershipIfLive(membershipId, new Date());

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
  backend: SupportBackend,
  userId: string,
): Promise<SupportDevice[]> {
  const rows = await backend.devicesOf(userId);

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
  backend: SupportBackend,
  userId: string,
  subscriptionId: string,
): Promise<boolean> {
  const row = await backend.findDevice(userId, subscriptionId);
  if (!row) return false;

  await backend.deleteDevice(subscriptionId);
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
  backend: SupportBackend,
  userId: string,
): Promise<void> {
  await backend.bumpSessionVersion(userId);
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
  backend: SupportBackend,
  userId: string,
): Promise<void> {
  await backend.bumpSyncEpoch(userId);
}

/** The current epoch and session version, read together on sign-in and sync. */
export async function userSyncState(
  backend: SupportBackend,
  userId: string,
): Promise<{ sessionVersion: number; syncEpoch: number } | null> {
  return backend.syncState(userId);
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
  backend: SupportBackend,
  userId: string,
  now: number,
): Promise<SupportTombstone[]> {
  const since = now - RESTORE_WINDOW_DAYS * 86_400_000;
  return backend.tombstonesSince(userId, since);
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
  backend: SupportBackend,
  userId: string,
  store: string,
  recordId: string,
  now: number,
): Promise<boolean> {
  const exists = await backend.hasTombstone(userId, store, recordId);
  if (!exists) return false;

  await backend.restoreTombstone(userId, store, recordId, now);
  return true;
}
