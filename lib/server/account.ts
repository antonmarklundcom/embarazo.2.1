import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";

import type { Database } from "./db";
import {
  accounts,
  aiGenerations,
  companionSnapshots,
  companionTasks,
  companionCheers,
  invites,
  pregnancies,
  pregnancyMembers,
  pushReminders,
  pushSubscriptions,
  schema,
  sessions,
  syncRecords,
  users,
  verificationTokens,
} from "./schema";

// BUILD-PLAN A5 — account deletion.
//
// ARCHITECTURE.md §8 makes this a hard requirement, not a feature: storing
// health data against an identity is only defensible if the user can take it
// back. "Delete" here means the rows are gone, not flagged.
//
// The shape of this file is deliberate. Deletion is expressed as a plan over an
// executor interface rather than as a sequence of Drizzle calls, for two
// reasons:
//
//   1. It makes "zero rows remain" provable in CI with no MySQL — the test
//      runs the real plan against an in-memory database and counts.
//   2. It makes coverage checkable. `TABLE_DISPOSITION` below names EVERY
//      table in the schema and what deletion does to it, and a test asserts
//      the list matches `schema` exactly. A future table added without a
//      deletion rule fails that test instead of quietly surviving a user's
//      "borrá todo".

/**
 * What account deletion does to each table. Every table in `schema` must
 * appear here — `account.test.ts` fails the build otherwise.
 */
export const TABLE_DISPOSITION = {
  // The account itself and everything hanging off it.
  users: "deleted",
  accounts: "deleted",
  sessions: "deleted",
  verificationTokens: "deleted",

  // Health data.
  syncRecords: "deleted",

  // Pregnancies the user owns, and every membership and invite attached to
  // them — deleting an owner must not leave a partner holding a live
  // membership to a pregnancy that no longer exists.
  pregnancies: "deleted",
  pregnancyMembers: "deleted",
  invites: "deleted",
  // E1. Keyed by pregnancy, so it goes with the owner's pregnancies. Leaving
  // it would keep serving a deleted account's week and due date to whoever
  // was still a member.
  companionSnapshots: "deleted",
  // K2. Both are keyed by pregnancy, so they go with the owner's pregnancies.
  // A leftover task would keep a deleted account's to-do list on a partner's
  // home screen; a leftover cheer would keep somebody sending encouragement
  // into an account that no longer exists.
  companionTasks: "deleted",
  // Also deleted by fromUserId: a companion who deletes *their own* account
  // should not leave their cheers standing on somebody else's home screen.
  companionCheers: "deleted",

  // Devices and paid-for work.
  pushSubscriptions: "deleted",
  // B5. Keyed by endpoint, not by user, so these are deleted via the user's
  // endpoints rather than by a userId column. Missing them would leave the
  // server poking a deleted account's phone on a schedule nobody can cancel.
  pushReminders: "deleted",
  aiGenerations: "deleted",

  // Carries no identity at all (ARCHITECTURE.md §4.5) — keyed
  // (week, contentId, day), so there is nothing here that belongs to anyone.
  contentStats: "no user data",

  // RETAINED, deliberately. This is the record of what an administrator did,
  // and it is what makes admin access to a health app defensible (§9). After
  // the user row is gone the ids in it resolve to nobody: they are opaque
  // UUIDs, and the table never holds health content. Deleting the audit trail
  // on request would mean a support-requested deletion could erase its own
  // evidence.
  adminAudit: "retained (audit trail, no identity, no content)",
} as const satisfies Record<keyof typeof schema, string>;

export interface DeletionCounts {
  [table: string]: number;
}

/**
 * The database operations deletion needs, and nothing more.
 *
 * `deleteAccountData` is written against this so the same plan runs against
 * Drizzle in production and against a Map in the tests.
 */
export interface AccountDeleteExecutor {
  /** Ids of pregnancies this user owns. */
  ownedPregnancyIds(userId: string): Promise<string[]>;
  /** The account's email, needed to clear `verificationTokens`. */
  emailOf(userId: string): Promise<string | null>;
  /** Delete rows and return how many went. */
  deleteSyncRecords(userId: string): Promise<number>;
  deleteAccounts(userId: string): Promise<number>;
  deleteSessions(userId: string): Promise<number>;
  deleteVerificationTokens(email: string | null): Promise<number>;
  /** Endpoints this user's devices registered, needed to clear reminders. */
  pushEndpointsOf(userId: string): Promise<string[]>;
  deletePushReminders(endpoints: string[]): Promise<number>;
  deletePushSubscriptions(userId: string): Promise<number>;
  deleteAiGenerations(userId: string): Promise<number>;
  /** Memberships held BY the user, plus every membership OF their pregnancies. */
  deleteMemberships(userId: string, pregnancyIds: string[]): Promise<number>;
  /** Invites they created, invites to their pregnancies, invites they accepted. */
  deleteInvites(userId: string, pregnancyIds: string[]): Promise<number>;
  deleteCompanionSnapshots(pregnancyIds: string[]): Promise<number>;
  /** K2: tasks belong to the pregnancy, so they go with it. */
  deleteCompanionTasks(pregnancyIds: string[]): Promise<number>;
  /**
   * K2: cheers go two ways — those sent *to* this user's pregnancies, and
   * those this user sent to somebody else's. Both must go.
   */
  deleteCompanionCheers(userId: string, pregnancyIds: string[]): Promise<number>;
  deletePregnancies(pregnancyIds: string[]): Promise<number>;
  deleteUser(userId: string): Promise<number>;
}

/**
 * Delete everything belonging to one user.
 *
 * Order matters only for readability — there are no foreign keys in this
 * schema — but the user row goes last so an interrupted deletion leaves an
 * account that can sign in and try again, rather than orphaned health data
 * with no owner to ask for its removal.
 */
export async function deleteAccountData(
  executor: AccountDeleteExecutor,
  userId: string,
): Promise<DeletionCounts> {
  const pregnancyIds = await executor.ownedPregnancyIds(userId);
  const email = await executor.emailOf(userId);
  // Read the endpoints before the subscriptions are deleted — afterwards
  // there is nothing left to look them up by.
  const endpoints = await executor.pushEndpointsOf(userId);

  return {
    syncRecords: await executor.deleteSyncRecords(userId),
    pushReminders: await executor.deletePushReminders(endpoints),
    pushSubscriptions: await executor.deletePushSubscriptions(userId),
    aiGenerations: await executor.deleteAiGenerations(userId),
    invites: await executor.deleteInvites(userId, pregnancyIds),
    pregnancyMembers: await executor.deleteMemberships(userId, pregnancyIds),
    companionSnapshots: await executor.deleteCompanionSnapshots(pregnancyIds),
    companionTasks: await executor.deleteCompanionTasks(pregnancyIds),
    companionCheers: await executor.deleteCompanionCheers(userId, pregnancyIds),
    pregnancies: await executor.deletePregnancies(pregnancyIds),
    accounts: await executor.deleteAccounts(userId),
    sessions: await executor.deleteSessions(userId),
    verificationTokens: await executor.deleteVerificationTokens(email),
    users: await executor.deleteUser(userId),
  };
}

// ---------------------------------------------------------------------------
// Drizzle executor
// ---------------------------------------------------------------------------

/** MySQL DELETE reports affected rows here. */
function affected(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const rows = (header as { affectedRows?: number } | undefined)?.affectedRows;
  return typeof rows === "number" ? rows : 0;
}

export function drizzleAccountExecutor(
  database: Database,
): AccountDeleteExecutor {
  return {
    async ownedPregnancyIds(userId) {
      const rows = await database
        .select({ id: pregnancies.id })
        .from(pregnancies)
        .where(eq(pregnancies.ownerUserId, userId));
      return rows.map((r) => r.id);
    },

    async emailOf(userId) {
      const rows = await database
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return rows[0]?.email ?? null;
    },

    async deleteSyncRecords(userId) {
      return affected(
        await database.delete(syncRecords).where(eq(syncRecords.userId, userId)),
      );
    },

    async deleteAccounts(userId) {
      return affected(
        await database.delete(accounts).where(eq(accounts.userId, userId)),
      );
    },

    async deleteSessions(userId) {
      return affected(
        await database.delete(sessions).where(eq(sessions.userId, userId)),
      );
    },

    async deleteVerificationTokens(email) {
      if (!email) return 0;
      return affected(
        await database
          .delete(verificationTokens)
          .where(eq(verificationTokens.identifier, email)),
      );
    },

    async pushEndpointsOf(userId) {
      const rows = await database
        .select({ endpoint: pushSubscriptions.endpoint })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));
      return rows.map((r) => r.endpoint);
    },

    async deletePushReminders(endpoints) {
      if (endpoints.length === 0) return 0;
      return affected(
        await database
          .delete(pushReminders)
          .where(inArray(pushReminders.endpoint, endpoints)),
      );
    },

    async deletePushSubscriptions(userId) {
      return affected(
        await database
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, userId)),
      );
    },

    async deleteAiGenerations(userId) {
      return affected(
        await database
          .delete(aiGenerations)
          .where(eq(aiGenerations.userId, userId)),
      );
    },

    async deleteMemberships(userId, pregnancyIds) {
      const clause =
        pregnancyIds.length > 0
          ? or(
              eq(pregnancyMembers.userId, userId),
              inArray(pregnancyMembers.pregnancyId, pregnancyIds),
            )
          : eq(pregnancyMembers.userId, userId);
      return affected(await database.delete(pregnancyMembers).where(clause));
    },

    async deleteInvites(userId, pregnancyIds) {
      const clauses = [
        eq(invites.createdByUserId, userId),
        eq(invites.acceptedByUserId, userId),
      ];
      if (pregnancyIds.length > 0) {
        clauses.push(inArray(invites.pregnancyId, pregnancyIds));
      }
      return affected(await database.delete(invites).where(or(...clauses)));
    },

    async deleteCompanionSnapshots(pregnancyIds) {
      if (pregnancyIds.length === 0) return 0;
      return affected(
        await database
          .delete(companionSnapshots)
          .where(inArray(companionSnapshots.pregnancyId, pregnancyIds)),
      );
    },

    async deleteCompanionTasks(pregnancyIds) {
      if (pregnancyIds.length === 0) return 0;
      return affected(
        await database
          .delete(companionTasks)
          .where(inArray(companionTasks.pregnancyId, pregnancyIds)),
      );
    },

    async deleteCompanionCheers(userId, pregnancyIds) {
      // `or` with an empty `inArray` is a SQL error, so the two halves are
      // issued separately when there is no pregnancy to match.
      const sent = affected(
        await database
          .delete(companionCheers)
          .where(eq(companionCheers.fromUserId, userId)),
      );
      if (pregnancyIds.length === 0) return sent;
      const received = affected(
        await database
          .delete(companionCheers)
          .where(inArray(companionCheers.pregnancyId, pregnancyIds)),
      );
      return sent + received;
    },

    async deletePregnancies(pregnancyIds) {
      if (pregnancyIds.length === 0) return 0;
      return affected(
        await database.delete(pregnancies).where(inArray(pregnancies.id, pregnancyIds)),
      );
    },

    async deleteUser(userId) {
      return affected(
        await database.delete(users).where(and(eq(users.id, userId))),
      );
    },
  };
}
