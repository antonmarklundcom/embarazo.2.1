import { describe, expect, it } from "vitest";

import {
  TABLE_DISPOSITION,
  deleteAccountData,
  type AccountDeleteExecutor,
} from "./account";
import { schema } from "./schema";

// BUILD-PLAN A5: "deletion leaves zero rows for that user, verified by a test".
//
// Two tests carry that requirement, and they check different things:
//
//   * The coverage test asserts every table in the schema has a documented
//     disposition. It is what stops a table added in E1 or B5 from quietly
//     surviving a user's "borrá todo" — the failure lands on whoever adds the
//     table, which is the only moment anyone can fix it cheaply.
//   * The execution test runs the real deletion plan over an in-memory
//     database and counts what is left. No MySQL needed.

// ---------------------------------------------------------------------------
// In-memory database
// ---------------------------------------------------------------------------

interface Row {
  [key: string]: unknown;
}

function memoryDb() {
  const tables: Record<string, Row[]> = {
    users: [],
    accounts: [],
    sessions: [],
    verificationTokens: [],
    syncRecords: [],
    pregnancies: [],
    pregnancyMembers: [],
    invites: [],
    pushSubscriptions: [],
    aiGenerations: [],
    pushReminders: [],
    companionSnapshots: [],
    contentStats: [],
    adminAudit: [],
  };

  function removeWhere(table: string, predicate: (row: Row) => boolean) {
    const before = tables[table]!.length;
    tables[table] = tables[table]!.filter((row) => !predicate(row));
    return before - tables[table]!.length;
  }

  const executor: AccountDeleteExecutor = {
    async ownedPregnancyIds(userId) {
      return tables.pregnancies!
        .filter((p) => p.ownerUserId === userId)
        .map((p) => p.id as string);
    },
    async emailOf(userId) {
      const user = tables.users!.find((u) => u.id === userId);
      return (user?.email as string | undefined) ?? null;
    },
    async deleteSyncRecords(userId) {
      return removeWhere("syncRecords", (r) => r.userId === userId);
    },
    async deleteAccounts(userId) {
      return removeWhere("accounts", (r) => r.userId === userId);
    },
    async deleteSessions(userId) {
      return removeWhere("sessions", (r) => r.userId === userId);
    },
    async deleteVerificationTokens(email) {
      if (!email) return 0;
      return removeWhere("verificationTokens", (r) => r.identifier === email);
    },
    async pushEndpointsOf(userId) {
      return tables.pushSubscriptions!
        .filter((r) => r.userId === userId)
        .map((r) => r.endpoint as string);
    },
    async deletePushReminders(endpoints) {
      return removeWhere("pushReminders", (r) =>
        endpoints.includes(r.endpoint as string),
      );
    },
    async deletePushSubscriptions(userId) {
      return removeWhere("pushSubscriptions", (r) => r.userId === userId);
    },
    async deleteAiGenerations(userId) {
      return removeWhere("aiGenerations", (r) => r.userId === userId);
    },
    async deleteMemberships(userId, pregnancyIds) {
      return removeWhere(
        "pregnancyMembers",
        (r) =>
          r.userId === userId ||
          pregnancyIds.includes(r.pregnancyId as string),
      );
    },
    async deleteInvites(userId, pregnancyIds) {
      return removeWhere(
        "invites",
        (r) =>
          r.createdByUserId === userId ||
          r.acceptedByUserId === userId ||
          pregnancyIds.includes(r.pregnancyId as string),
      );
    },
    async deleteCompanionSnapshots(pregnancyIds) {
      return removeWhere("companionSnapshots", (r) =>
        pregnancyIds.includes(r.pregnancyId as string),
      );
    },
    async deletePregnancies(pregnancyIds) {
      return removeWhere("pregnancies", (r) =>
        pregnancyIds.includes(r.id as string),
      );
    },
    async deleteUser(userId) {
      return removeWhere("users", (r) => r.id === userId);
    },
  };

  return { tables, executor };
}

const VICTIM = "user-a";
const BYSTANDER = "user-b";

function seed(db: ReturnType<typeof memoryDb>) {
  const { tables } = db;
  tables.users!.push(
    { id: VICTIM, email: "a@example.com" },
    { id: BYSTANDER, email: "b@example.com" },
  );
  tables.accounts!.push(
    { userId: VICTIM, provider: "google" },
    { userId: BYSTANDER, provider: "google" },
  );
  tables.sessions!.push({ userId: VICTIM }, { userId: BYSTANDER });
  tables.verificationTokens!.push(
    { identifier: "a@example.com" },
    { identifier: "b@example.com" },
  );

  for (let i = 0; i < 37; i += 1) {
    tables.syncRecords!.push({ userId: VICTIM, store: "journalEntries" });
  }
  tables.syncRecords!.push({ userId: BYSTANDER, store: "journalEntries" });

  // The victim owns a pregnancy the bystander is a partner on, and is a
  // partner on a pregnancy the bystander owns.
  tables.pregnancies!.push(
    { id: "preg-a", ownerUserId: VICTIM },
    { id: "preg-b", ownerUserId: BYSTANDER },
  );
  tables.pregnancyMembers!.push(
    { pregnancyId: "preg-a", userId: VICTIM, role: "owner" },
    { pregnancyId: "preg-a", userId: BYSTANDER, role: "partner" },
    { pregnancyId: "preg-b", userId: BYSTANDER, role: "owner" },
    { pregnancyId: "preg-b", userId: VICTIM, role: "partner" },
  );
  tables.invites!.push(
    { code: "1", pregnancyId: "preg-a", createdByUserId: VICTIM },
    { code: "2", pregnancyId: "preg-b", createdByUserId: BYSTANDER, acceptedByUserId: VICTIM },
    { code: "3", pregnancyId: "preg-b", createdByUserId: BYSTANDER },
  );

  tables.pushSubscriptions!.push(
    { userId: VICTIM, endpoint: "x" },
    { userId: BYSTANDER, endpoint: "y" },
  );
  tables.pushReminders!.push(
    { endpoint: "x", category: "recordatorios", fireAt: 1 },
    { endpoint: "y", category: "recordatorios", fireAt: 2 },
  );
  tables.companionSnapshots!.push(
    { pregnancyId: "preg-a", week: 24 },
    { pregnancyId: "preg-b", week: 12 },
  );
  tables.aiGenerations!.push({ userId: VICTIM }, { userId: BYSTANDER });

  tables.contentStats!.push({ week: 12, contentId: "guia", day: "2026-08-12" });
  tables.adminAudit!.push({
    actorUserId: "admin-1",
    action: "support_delete",
    targetUserId: VICTIM,
  });
}

// ---------------------------------------------------------------------------

describe("every table has a documented disposition", () => {
  it("covers the schema exactly — a new table without a rule fails here", () => {
    expect(Object.keys(TABLE_DISPOSITION).sort()).toEqual(
      Object.keys(schema).sort(),
    );
  });

  it("keeps the audit trail and nothing else", () => {
    const retained = Object.entries(TABLE_DISPOSITION)
      .filter(([, rule]) => rule.startsWith("retained"))
      .map(([table]) => table);
    expect(retained).toEqual(["adminAudit"]);
  });
});

describe("deleteAccountData", () => {
  it("leaves zero rows for the deleted user", async () => {
    const db = memoryDb();
    seed(db);

    await deleteAccountData(db.executor, VICTIM);

    // The audit trail keeps the id on purpose (see TABLE_DISPOSITION), so it
    // is excluded from the sweep rather than the assertion being weakened.
    const rest = Object.fromEntries(
      Object.entries(db.tables).filter(([name]) => name !== "adminAudit"),
    );
    expect(JSON.stringify(rest)).not.toContain(VICTIM);
    expect(JSON.stringify(rest)).not.toContain("a@example.com");
    expect(JSON.stringify(db.tables.adminAudit)).toContain(VICTIM);
  });

  it("reports what it deleted, per table", async () => {
    const db = memoryDb();
    seed(db);

    const counts = await deleteAccountData(db.executor, VICTIM);

    expect(counts.syncRecords).toBe(37);
    expect(counts.users).toBe(1);
    expect(counts.pregnancies).toBe(1);
    expect(counts.pushSubscriptions).toBe(1);
    expect(counts.verificationTokens).toBe(1);
    expect(counts.pushReminders).toBe(1);
  });

  it("cancels the scheduled pushes to a deleted account's devices", async () => {
    // Reminders are keyed by endpoint, not by user id, so deleting the
    // subscriptions is not enough — miss these and the server keeps poking a
    // deleted account's phone on a schedule nobody can cancel.
    const db = memoryDb();
    seed(db);
    await deleteAccountData(db.executor, VICTIM);
    expect(db.tables.pushReminders!.map((r) => r.endpoint)).toEqual(["y"]);
  });

  it("does not touch another user's data", async () => {
    const db = memoryDb();
    seed(db);

    await deleteAccountData(db.executor, VICTIM);

    expect(db.tables.users).toHaveLength(1);
    expect(db.tables.users![0]!.id).toBe(BYSTANDER);
    expect(db.tables.syncRecords).toHaveLength(1);
    expect(db.tables.pregnancies).toHaveLength(1);
    expect(db.tables.aiGenerations).toHaveLength(1);
    // The bystander's own invite to their own pregnancy survives.
    expect(db.tables.invites!.map((i) => i.code)).toEqual(["3"]);
  });

  it("stops serving the deleted owner's week to their family", async () => {
    // The companion snapshot is the ONLY thing a non-owner could read (E1);
    // leaving it behind would keep answering for a deleted account.
    const db = memoryDb();
    seed(db);
    await deleteAccountData(db.executor, VICTIM);
    expect(db.tables.companionSnapshots!.map((r) => r.pregnancyId)).toEqual([
      "preg-b",
    ]);
  });

  it("removes a partner's access to the deleted owner's pregnancy", async () => {
    // Otherwise the bystander keeps a live membership pointing at a pregnancy
    // that no longer exists — a dangling read grant on health data.
    const db = memoryDb();
    seed(db);

    await deleteAccountData(db.executor, VICTIM);

    expect(
      db.tables.pregnancyMembers!.some((m) => m.pregnancyId === "preg-a"),
    ).toBe(false);
    // …but their own pregnancy's membership is untouched.
    expect(
      db.tables.pregnancyMembers!.some(
        (m) => m.pregnancyId === "preg-b" && m.userId === BYSTANDER,
      ),
    ).toBe(true);
  });

  it("leaves the anonymous content counters alone", async () => {
    const db = memoryDb();
    seed(db);
    await deleteAccountData(db.executor, VICTIM);
    // Nothing in contentStats belongs to anybody (§4.5), so there is nothing
    // to delete and deleting it would corrupt an aggregate.
    expect(db.tables.contentStats).toHaveLength(1);
  });

  it("is idempotent — deleting twice is not an error", async () => {
    const db = memoryDb();
    seed(db);
    await deleteAccountData(db.executor, VICTIM);
    const second = await deleteAccountData(db.executor, VICTIM);
    expect(Object.values(second).every((n) => n === 0)).toBe(true);
  });
});
