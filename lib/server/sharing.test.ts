import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  CHEER_PAGE_SIZE,
  acceptInvite,
  assignTask,
  createInvite,
  ensurePregnancyForOwner,
  liveMembership,
  markCheersSeen,
  membersOf,
  membershipsOf,
  publishSnapshot,
  readCheersFor,
  readSnapshotFor,
  readTasksFor,
  revokeInviteCode,
  revokeMembership,
  sendCheer,
  setAccompanying,
  setTaskDone,
  unassignTask,
} from "./sharing";
import type {
  SharingBackend,
  StoredCheer,
  StoredInvite,
  StoredMembership,
  StoredSnapshot,
  StoredTask,
} from "./sharingBackend";
import { buildSnapshot, type MemberRole } from "@/lib/sharing/fields";
import { SHARING_DEFAULTS, emptyExtras } from "@/lib/sharing/levels";

// BUILD-PLAN V2 — what family sharing decides, asserted.
//
// These run the real `lib/server/sharing.ts` — the same functions the route
// calls, unmodified — with a Map underneath instead of MySQL, exactly as A3's
// `sync.test.ts` runs the real `pushRecords`/`pullRecords`. What is under test
// is the set of answers this app gives to "who may see whose pregnancy", which
// is the question E1 exists to answer and the one that had no unit test at all
// before this, because asking it meant standing up a database.
//
// The assertions are about decisions, never about queries. "A revoked member
// reads nothing" is a promise to a user; `isNull(revokedAt)` is how one backend
// keeps it. `lib/sharing/routeContract.test.ts` still watches the SQL.

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------

interface MemoryRow extends StoredMembership {
  id: string;
  revokedAt: Date | null;
}

function memoryBackend(): SharingBackend & {
  pregnancies: Map<string, { id: string; ownerUserId: string }>;
  members: Map<string, MemoryRow>;
  invites: Map<string, StoredInvite>;
  snapshots: Map<string, StoredSnapshot>;
  tasks: Map<string, StoredTask & { pregnancyId: string }>;
  cheers: (StoredCheer & { pregnancyId: string; fromUserId: string })[];
} {
  const pregnancies = new Map<string, { id: string; ownerUserId: string }>();
  const members = new Map<string, MemoryRow>();
  const invites = new Map<string, StoredInvite>();
  const snapshots = new Map<string, StoredSnapshot>();
  const tasks = new Map<string, StoredTask & { pregnancyId: string }>();
  const cheers: (StoredCheer & {
    pregnancyId: string;
    fromUserId: string;
  })[] = [];

  const memberKey = (pregnancyId: string, userId: string) =>
    `${pregnancyId}|${userId}`;
  const taskKey = (pregnancyId: string, itemKey: string) =>
    `${pregnancyId}|${itemKey}`;
  const live = (row: MemoryRow) => row.revokedAt === null;

  return {
    pregnancies,
    members,
    invites,
    snapshots,
    tasks,
    cheers,

    async findPregnancyByOwner(ownerUserId) {
      for (const row of pregnancies.values()) {
        if (row.ownerUserId === ownerUserId) return row.id;
      }
      return null;
    },

    async insertPregnancy(row) {
      // Mirrors `pregnancies_owner_idx`: the unique index is what settles the
      // read-then-insert race, so the duplicate has to throw here too or the
      // recovery path in `ensurePregnancyForOwner` is never exercised.
      for (const existing of pregnancies.values()) {
        if (existing.ownerUserId === row.ownerUserId) {
          throw new Error("ER_DUP_ENTRY: pregnancies_owner_idx");
        }
      }
      pregnancies.set(row.id, { id: row.id, ownerUserId: row.ownerUserId });
    },

    async findPregnancyOwner(pregnancyId) {
      return pregnancies.get(pregnancyId)?.ownerUserId ?? null;
    },

    async insertMembership(row) {
      members.set(memberKey(row.pregnancyId, row.userId), {
        ...row,
        accompanyingAt: null,
        createdAt: new Date(),
        revokedAt: null,
      });
    },

    async upsertMembership(row) {
      const key = memberKey(row.pregnancyId, row.userId);
      const existing = members.get(key);
      if (existing) {
        // Mirrors ON DUPLICATE KEY UPDATE: re-accepting un-revokes in place.
        existing.role = row.role;
        existing.revokedAt = null;
        return;
      }
      members.set(key, {
        ...row,
        accompanyingAt: null,
        createdAt: new Date(),
        revokedAt: null,
      });
    },

    async liveMembership(userId, pregnancyId) {
      const row = members.get(memberKey(pregnancyId, userId));
      return row && live(row) ? { ...row } : null;
    },

    async liveMembershipsOf(userId) {
      return [...members.values()]
        .filter((row) => row.userId === userId && live(row))
        .map((row) => ({ ...row }));
    },

    async liveMembersOf(pregnancyId) {
      return [...members.values()]
        .filter((row) => row.pregnancyId === pregnancyId && live(row))
        .map((row) => ({ ...row }));
    },

    async liveNonOwnerCount(pregnancyId) {
      return [...members.values()].filter(
        (row) =>
          row.pregnancyId === pregnancyId && live(row) && row.role !== "owner",
      ).length;
    },

    async revokeMembership(pregnancyId, userId, at) {
      const row = members.get(memberKey(pregnancyId, userId));
      if (row) row.revokedAt = at;
    },

    async setAccompanyingIfLive(userId, pregnancyId, appointmentAt) {
      const row = members.get(memberKey(pregnancyId, userId));
      // Scoped to a live membership, like the UPDATE's WHERE clause.
      if (row && live(row)) row.accompanyingAt = appointmentAt;
    },

    async insertInvite(row) {
      invites.set(row.code, {
        ...row,
        acceptedAt: null,
        acceptedByUserId: null,
        revokedAt: null,
      });
    },

    async findInvite(code) {
      const row = invites.get(code);
      return row ? { ...row } : null;
    },

    async markInviteAccepted(code, userId, at) {
      const row = invites.get(code);
      if (row) {
        row.acceptedAt = at;
        row.acceptedByUserId = userId;
      }
    },

    async revokeInvite(pregnancyId, code, at) {
      const row = invites.get(code);
      // Scoped to the pregnancy, so one owner cannot revoke another's code.
      if (row && row.pregnancyId === pregnancyId) row.revokedAt = at;
    },

    async upsertSnapshot(row) {
      snapshots.set(row.pregnancyId, { ...row });
    },

    async findSnapshot(pregnancyId) {
      const row = snapshots.get(pregnancyId);
      return row ? { ...row } : null;
    },

    async deleteSnapshot(pregnancyId) {
      snapshots.delete(pregnancyId);
    },

    async upsertTask(row) {
      const key = taskKey(row.pregnancyId, row.itemKey);
      const existing = tasks.get(key);
      if (existing) {
        // `doneAt` survives a re-assignment, as the ON DUPLICATE KEY set does.
        existing.updatedAt = row.updatedAt;
        return;
      }
      tasks.set(key, {
        pregnancyId: row.pregnancyId,
        itemKey: row.itemKey,
        doneAt: null,
        updatedAt: row.updatedAt,
      });
    },

    async deleteTask(pregnancyId, itemKey) {
      tasks.delete(taskKey(pregnancyId, itemKey));
    },

    async setTaskDone(pregnancyId, itemKey, doneAt, updatedAt) {
      const row = tasks.get(taskKey(pregnancyId, itemKey));
      // An unassigned key matches no row and changes nothing — no insert.
      if (row) {
        row.doneAt = doneAt;
        row.updatedAt = updatedAt;
      }
    },

    async tasksOf(pregnancyId) {
      return [...tasks.values()]
        .filter((row) => row.pregnancyId === pregnancyId)
        .map(({ itemKey, doneAt, updatedAt }) => ({
          itemKey,
          doneAt,
          updatedAt,
        }));
    },

    async insertCheer(row) {
      cheers.push({ ...row, seenAt: null });
    },

    async cheersOf(pregnancyId, limit) {
      return cheers
        .filter((row) => row.pregnancyId === pregnancyId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map(({ cheerId, createdAt, seenAt }) => ({
          cheerId,
          createdAt,
          seenAt,
        }));
    },

    async markCheersSeen(pregnancyId, seenAt) {
      for (const row of cheers) {
        if (row.pregnancyId === pregnancyId && row.seenAt === null) {
          row.seenAt = seenAt;
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OWNER = "user-owner";
const PARTNER = "user-partner";
const FAMILY = "user-family";
const STRANGER = "user-stranger";
const NOW = 1_760_000_000_000;

type Backend = ReturnType<typeof memoryBackend>;

/** A pregnancy owned by OWNER, with whichever companions the test needs. */
async function setUp(
  companions: Partial<Record<MemberRole, string>> = {},
): Promise<{ backend: Backend; pregnancyId: string }> {
  const backend = memoryBackend();
  const pregnancyId = await ensurePregnancyForOwner(backend, OWNER, NOW);

  for (const [role, userId] of Object.entries(companions)) {
    if (!userId) continue;
    const invite = await createInvite(
      backend,
      pregnancyId,
      OWNER,
      role as Exclude<MemberRole, "owner">,
      NOW,
    );
    await acceptInvite(backend, invite.code, userId, NOW);
  }

  return { backend, pregnancyId };
}

const SNAPSHOT = buildSnapshot({
  week: 24,
  dueDate: NOW + 100 * 24 * 60 * 60 * 1000,
  nextAppointmentAt: NOW + 3 * 24 * 60 * 60 * 1000,
  babyName: "Poroto",
  now: NOW,
});

const EXTRAS = {
  weightGrams: 68_400,
  weightAt: NOW,
  kickCount: 11,
  kickAt: NOW,
};

// ---------------------------------------------------------------------------
// The pregnancy, and who is in it
// ---------------------------------------------------------------------------

describe("a pregnancy belongs to exactly one owner", () => {
  it("creates it once and returns the same id afterwards", async () => {
    const backend = memoryBackend();
    const first = await ensurePregnancyForOwner(backend, OWNER, NOW);
    const second = await ensurePregnancyForOwner(backend, OWNER, NOW + 1000);

    expect(second).toBe(first);
    expect(backend.pregnancies.size).toBe(1);
  });

  it("makes the owner a member of her own pregnancy", async () => {
    const { backend, pregnancyId } = await setUp();
    const membership = await liveMembership(backend, OWNER, pregnancyId);

    // Without this row, "who can see this" has to special-case the owner in
    // every query that asks.
    expect(membership).toEqual({ pregnancyId, role: "owner" });
  });

  it("survives losing the read-then-insert race instead of creating a second", async () => {
    // K14: two requests from the same account arriving together both read
    // nothing and both insert. The unique index turns the loser's insert into
    // an error, and the recovery is to re-read what the winner committed.
    const backend = memoryBackend();
    const winner = await ensurePregnancyForOwner(backend, OWNER, NOW);

    const loser = await ensurePregnancyForOwner(backend, OWNER, NOW);

    expect(loser).toBe(winner);
    expect(backend.pregnancies.size).toBe(1);
  });

  it("re-throws a failure that is not the race", async () => {
    const backend = memoryBackend();
    backend.insertPregnancy = async () => {
      throw new Error("connection lost");
    };

    await expect(ensurePregnancyForOwner(backend, OWNER, NOW)).rejects.toThrow(
      "connection lost",
    );
  });

  it("gives two owners two separate pregnancies", async () => {
    const backend = memoryBackend();
    const hers = await ensurePregnancyForOwner(backend, OWNER, NOW);
    const theirs = await ensurePregnancyForOwner(backend, "user-other", NOW);

    expect(theirs).not.toBe(hers);
  });
});

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

describe("an invite is single-use", () => {
  it("lets the first person in", async () => {
    const { backend, pregnancyId } = await setUp();
    const invite = await createInvite(
      backend,
      pregnancyId,
      OWNER,
      "partner",
      NOW,
    );

    const outcome = await acceptInvite(backend, invite.code, PARTNER, NOW);

    expect(outcome).toEqual({ ok: true, pregnancyId, role: "partner" });
  });

  it("refuses a second person, because the thing behind the link is a pregnancy", async () => {
    const { backend, pregnancyId } = await setUp();
    const invite = await createInvite(
      backend,
      pregnancyId,
      OWNER,
      "partner",
      NOW,
    );
    await acceptInvite(backend, invite.code, PARTNER, NOW);

    // A link forwarded on from a WhatsApp group.
    const second = await acceptInvite(backend, invite.code, STRANGER, NOW + 60);

    expect(second).toEqual({ ok: false, reason: "used" });
    expect(await liveMembership(backend, STRANGER, pregnancyId)).toBeNull();
  });

  it("lets the SAME person accept twice, which is a re-tap and not a breach", async () => {
    const { backend, pregnancyId } = await setUp();
    const invite = await createInvite(
      backend,
      pregnancyId,
      OWNER,
      "partner",
      NOW,
    );
    await acceptInvite(backend, invite.code, PARTNER, NOW);

    const again = await acceptInvite(backend, invite.code, PARTNER, NOW + 60);

    expect(again).toEqual({ ok: true, pregnancyId, role: "partner" });
  });

  it("un-revokes a member who re-accepts, rather than failing on the index", async () => {
    const { backend, pregnancyId } = await setUp();
    const invite = await createInvite(
      backend,
      pregnancyId,
      OWNER,
      "partner",
      NOW,
    );
    await acceptInvite(backend, invite.code, PARTNER, NOW);
    await revokeMembership(backend, pregnancyId, PARTNER);

    await acceptInvite(backend, invite.code, PARTNER, NOW + 60);

    expect(await liveMembership(backend, PARTNER, pregnancyId)).toEqual({
      pregnancyId,
      role: "partner",
    });
  });

  it("expires, because a link in a WhatsApp thread should not work forever", async () => {
    const { backend, pregnancyId } = await setUp();
    const invite = await createInvite(
      backend,
      pregnancyId,
      OWNER,
      "family",
      NOW,
    );

    const late = invite.expiresAt.getTime() + 1;
    expect(await acceptInvite(backend, invite.code, FAMILY, late)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("is still good one millisecond before it expires", async () => {
    const { backend, pregnancyId } = await setUp();
    const invite = await createInvite(
      backend,
      pregnancyId,
      OWNER,
      "family",
      NOW,
    );

    const outcome = await acceptInvite(
      backend,
      invite.code,
      FAMILY,
      invite.expiresAt.getTime() - 1,
    );
    expect(outcome.ok).toBe(true);
  });

  it("reports a code nobody issued as not-found, not as an error", async () => {
    const { backend } = await setUp();
    expect(await acceptInvite(backend, "ZZZZZZZZZZ", STRANGER, NOW)).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("stops working once the owner revokes it", async () => {
    const { backend, pregnancyId } = await setUp();
    const invite = await createInvite(
      backend,
      pregnancyId,
      OWNER,
      "family",
      NOW,
    );

    await revokeInviteCode(backend, pregnancyId, invite.code);

    expect(await acceptInvite(backend, invite.code, FAMILY, NOW)).toEqual({
      ok: false,
      reason: "revoked",
    });
  });

  it("checks revocation before expiry, so a revoked code never reads as merely stale", async () => {
    const { backend, pregnancyId } = await setUp();
    const invite = await createInvite(
      backend,
      pregnancyId,
      OWNER,
      "family",
      NOW,
    );
    await revokeInviteCode(backend, pregnancyId, invite.code);

    const late = invite.expiresAt.getTime() + 1;
    expect(await acceptInvite(backend, invite.code, FAMILY, late)).toEqual({
      ok: false,
      reason: "revoked",
    });
  });

  it("does not let one owner revoke another owner's code", async () => {
    const { backend, pregnancyId } = await setUp();
    const other = await ensurePregnancyForOwner(backend, "user-other", NOW);
    const invite = await createInvite(
      backend,
      pregnancyId,
      OWNER,
      "family",
      NOW,
    );

    await revokeInviteCode(backend, other, invite.code);

    expect((await acceptInvite(backend, invite.code, FAMILY, NOW)).ok).toBe(
      true,
    );
  });

  it("carries the role the owner chose onto the membership", async () => {
    const { backend, pregnancyId } = await setUp();
    const invite = await createInvite(
      backend,
      pregnancyId,
      OWNER,
      "family",
      NOW,
    );
    await acceptInvite(backend, invite.code, FAMILY, NOW);

    expect(await liveMembership(backend, FAMILY, pregnancyId)).toEqual({
      pregnancyId,
      role: "family",
    });
  });
});

// ---------------------------------------------------------------------------
// Revocation
// ---------------------------------------------------------------------------

describe("revoking access is immediate, not eventual", () => {
  it("cuts the snapshot off on the very next read", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await publishSnapshot(backend, pregnancyId, SNAPSHOT, SHARING_DEFAULTS);
    expect(await readSnapshotFor(backend, PARTNER, pregnancyId)).not.toBeNull();

    await revokeMembership(backend, pregnancyId, PARTNER);

    // Null, not an empty snapshot: there is no membership to answer through.
    expect(await readSnapshotFor(backend, PARTNER, pregnancyId)).toBeNull();
  });

  it("drops the snapshot row when the last companion goes", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await publishSnapshot(backend, pregnancyId, SNAPSHOT, SHARING_DEFAULTS);

    await revokeMembership(backend, pregnancyId, PARTNER);

    // E1's argument is that "a companion sees nothing else" holds because the
    // data does not exist, not because a filter hides it. A retained snapshot
    // is that argument's loose end.
    expect(backend.snapshots.size).toBe(0);
  });

  it("keeps the snapshot while somebody else can still see it", async () => {
    const { backend, pregnancyId } = await setUp({
      partner: PARTNER,
      family: FAMILY,
    });
    await publishSnapshot(backend, pregnancyId, SNAPSHOT, SHARING_DEFAULTS);

    await revokeMembership(backend, pregnancyId, PARTNER);

    expect(backend.snapshots.size).toBe(1);
    expect(await readSnapshotFor(backend, FAMILY, pregnancyId)).not.toBeNull();
  });

  it("does not count the owner as a companion", async () => {
    // A pregnancy always has an owner. If she counted, the snapshot would
    // never be dropped and the rule would be dead code.
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await publishSnapshot(backend, pregnancyId, SNAPSHOT, SHARING_DEFAULTS);

    await revokeMembership(backend, pregnancyId, PARTNER);

    expect(backend.snapshots.size).toBe(0);
  });

  it("takes the pregnancy off the revoked member's own list", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    expect(await membershipsOf(backend, PARTNER)).toHaveLength(1);

    await revokeMembership(backend, pregnancyId, PARTNER);

    expect(await membershipsOf(backend, PARTNER)).toEqual([]);
  });

  it("takes them off the owner's guest list", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });

    await revokeMembership(backend, pregnancyId, PARTNER);

    expect((await membersOf(backend, pregnancyId)).map((m) => m.userId)).toEqual(
      [OWNER],
    );
  });

  it("stops a revoked companion cheering, ticking or accompanying", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await revokeMembership(backend, pregnancyId, PARTNER);

    expect(
      await sendCheer(backend, PARTNER, pregnancyId, "fuerza", NOW),
    ).toBeNull();
    expect(
      await setAccompanying(backend, PARTNER, pregnancyId, NOW + 1000),
    ).toBe(false);
    expect(await readTasksFor(backend, PARTNER, pregnancyId)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The snapshot, and K3's two gates
// ---------------------------------------------------------------------------

describe("what a companion may read", () => {
  it("gives a partner the four E1 facts", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await publishSnapshot(backend, pregnancyId, SNAPSHOT, SHARING_DEFAULTS);

    const view = await readSnapshotFor(backend, PARTNER, pregnancyId);

    expect(view?.snapshot).toEqual(SNAPSHOT);
  });

  it("gives a stranger nothing at all", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await publishSnapshot(backend, pregnancyId, SNAPSHOT, SHARING_DEFAULTS);

    expect(await readSnapshotFor(backend, STRANGER, pregnancyId)).toBeNull();
  });

  it("answers with a null snapshot, not null, for a member whose owner never published", async () => {
    // These two are different answers and the difference matters: "you are not
    // allowed" versus "she has not opened the app yet".
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });

    expect(await readSnapshotFor(backend, PARTNER, pregnancyId)).toEqual({
      role: "partner",
      snapshot: null,
      extras: null,
    });
  });

  it("never hands a familiar a partner-level field, whatever the owner turned on", async () => {
    const { backend, pregnancyId } = await setUp({
      partner: PARTNER,
      family: FAMILY,
    });
    await publishSnapshot(
      backend,
      pregnancyId,
      SNAPSHOT,
      { peso: true, pataditas: true, fotos: true },
      EXTRAS,
    );

    const familyView = await readSnapshotFor(backend, FAMILY, pregnancyId);

    // Somebody's aunt does not get their weight because the app could not
    // think of a reason to stop her.
    expect(familyView?.extras).toBeNull();
    expect(familyView?.snapshot).toEqual(SNAPSHOT);
  });

  it("hands the pareja exactly the levels the owner turned on", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await publishSnapshot(
      backend,
      pregnancyId,
      SNAPSHOT,
      { peso: true, pataditas: false, fotos: false },
      EXTRAS,
    );

    const view = await readSnapshotFor(backend, PARTNER, pregnancyId);

    expect(view?.extras).toEqual({
      weightGrams: EXTRAS.weightGrams,
      weightAt: EXTRAS.weightAt,
      kickCount: null,
      kickAt: null,
    });
  });

  it("stores nothing for a level that is off, even when the device sends it", async () => {
    // K3's whole point: an old build, a bug or a hand-rolled request that sends
    // a weight with `peso: false` stores a null, not a value nobody agreed to
    // share. The device applying the levels first is a courtesy; this is the rule.
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });

    await publishSnapshot(
      backend,
      pregnancyId,
      SNAPSHOT,
      SHARING_DEFAULTS,
      EXTRAS,
    );

    expect(backend.snapshots.get(pregnancyId)?.weightGrams).toBeNull();
    expect(backend.snapshots.get(pregnancyId)?.kickCount).toBeNull();
  });

  it("re-applies the levels on the way OUT as well, from the stored flags", async () => {
    // The second of K3's two gates. A row whose flag says "off" must not be
    // served, even if a value somehow sits beside it — which is what makes
    // switching a level off take effect when her device never publishes again.
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await publishSnapshot(
      backend,
      pregnancyId,
      SNAPSHOT,
      { peso: true, pataditas: true, fotos: false },
      EXTRAS,
    );

    const stored = backend.snapshots.get(pregnancyId)!;
    stored.sharePeso = false;

    const view = await readSnapshotFor(backend, PARTNER, pregnancyId);
    expect(view?.extras?.weightGrams).toBeNull();
    expect(view?.extras?.kickCount).toBe(EXTRAS.kickCount);
  });

  it("clears the values in the same write that records a level going off", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await publishSnapshot(
      backend,
      pregnancyId,
      SNAPSHOT,
      { peso: true, pataditas: true, fotos: false },
      EXTRAS,
    );

    await publishSnapshot(
      backend,
      pregnancyId,
      SNAPSHOT,
      SHARING_DEFAULTS,
      EXTRAS,
    );

    const stored = backend.snapshots.get(pregnancyId)!;
    expect(stored.weightGrams).toBeNull();
    expect(stored.weightAt).toBeNull();
    expect(stored.kickCount).toBeNull();
    expect(stored.kickAt).toBeNull();
  });

  it("gives the owner her own snapshot back without extras", async () => {
    // `canSeeSharingLevels` is "the pareja only, ever" — the owner reads her
    // own values from her own device, not from here.
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await publishSnapshot(
      backend,
      pregnancyId,
      SNAPSHOT,
      { peso: true, pataditas: true, fotos: true },
      EXTRAS,
    );

    const view = await readSnapshotFor(backend, OWNER, pregnancyId);

    expect(view?.role).toBe("owner");
    expect(view?.extras).toBeNull();
  });

  it("publishes an empty extras block when the caller passes none", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });

    await publishSnapshot(backend, pregnancyId, SNAPSHOT, {
      peso: true,
      pataditas: true,
      fotos: true,
    });

    expect(backend.snapshots.get(pregnancyId)).toMatchObject(emptyExtras());
  });
});

// ---------------------------------------------------------------------------
// K8 — "yo la acompaño"
// ---------------------------------------------------------------------------

describe("who is coming to the control", () => {
  it("lets a companion say they will be there", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    const at = NOW + 3 * 24 * 60 * 60 * 1000;

    expect(await setAccompanying(backend, PARTNER, pregnancyId, at)).toBe(true);

    const [mine] = await membershipsOf(backend, PARTNER);
    expect(mine?.accompanyingAt).toBe(at);
  });

  it("refuses the owner — she is not accompanying herself", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });

    expect(await setAccompanying(backend, OWNER, pregnancyId, NOW)).toBe(false);
  });

  it("refuses a stranger", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });

    expect(await setAccompanying(backend, STRANGER, pregnancyId, NOW)).toBe(
      false,
    );
  });

  it("clears with null", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await setAccompanying(backend, PARTNER, pregnancyId, NOW + 1000);

    await setAccompanying(backend, PARTNER, pregnancyId, null);

    const [mine] = await membershipsOf(backend, PARTNER);
    expect(mine?.accompanyingAt).toBeNull();
  });

  it("shows the owner who is coming, by role, and never a name she was not given", async () => {
    const { backend, pregnancyId } = await setUp({
      partner: PARTNER,
      family: FAMILY,
    });
    const at = NOW + 1000;
    await setAccompanying(backend, PARTNER, pregnancyId, at);

    const members = await membersOf(backend, pregnancyId);

    expect(
      members.find((m) => m.role === "partner")?.accompanyingAt,
    ).toBe(at);
    expect(members.find((m) => m.role === "family")?.accompanyingAt).toBeNull();
    // E1 never shared names between members and K8 does not start.
    for (const member of members) {
      expect(Object.keys(member).sort()).toEqual([
        "accompanyingAt",
        "createdAt",
        "role",
        "userId",
      ]);
    }
  });

  it("does not leak one companion's answer to another", async () => {
    // A companion does not get the guest list; `membershipsOf` is their row and
    // nobody else's.
    const { backend, pregnancyId } = await setUp({
      partner: PARTNER,
      family: FAMILY,
    });
    await setAccompanying(backend, PARTNER, pregnancyId, NOW + 1000);

    const theirs = await membershipsOf(backend, FAMILY);

    expect(theirs).toEqual([
      { pregnancyId, role: "family", accompanyingAt: null },
    ]);
  });
});

// ---------------------------------------------------------------------------
// K2 — shared checklist items
// ---------------------------------------------------------------------------

describe("the shared checklist", () => {
  const ITEM = "bolso-carnet";

  it("shows an assigned item to the pareja", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await assignTask(backend, pregnancyId, ITEM, NOW);

    expect(await readTasksFor(backend, PARTNER, pregnancyId)).toEqual([
      { itemKey: ITEM, doneAt: null, updatedAt: NOW },
    ]);
  });

  it("shows the owner her own list", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await assignTask(backend, pregnancyId, ITEM, NOW);

    expect(await readTasksFor(backend, OWNER, pregnancyId)).toHaveLength(1);
  });

  it("gives a familiar null, not an empty list", async () => {
    const { backend, pregnancyId } = await setUp({ family: FAMILY });
    await assignTask(backend, pregnancyId, ITEM, NOW);

    // "There is nothing assigned" is itself an answer, and a family member is
    // not entitled to it.
    expect(await readTasksFor(backend, FAMILY, pregnancyId)).toBeNull();
  });

  it("gives a stranger null", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });

    expect(await readTasksFor(backend, STRANGER, pregnancyId)).toBeNull();
  });

  it("treats assigning twice as the same assignment", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await assignTask(backend, pregnancyId, ITEM, NOW);

    await assignTask(backend, pregnancyId, ITEM, NOW + 5000);

    const tasks = await readTasksFor(backend, PARTNER, pregnancyId);
    expect(tasks).toHaveLength(1);
    expect(tasks?.[0]?.updatedAt).toBe(NOW + 5000);
  });

  it("does not un-do the pareja's work when the owner re-taps it", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await assignTask(backend, pregnancyId, ITEM, NOW);
    await setTaskDone(backend, pregnancyId, ITEM, true, NOW + 1000);

    await assignTask(backend, pregnancyId, ITEM, NOW + 2000);

    const tasks = await readTasksFor(backend, PARTNER, pregnancyId);
    expect(tasks?.[0]?.doneAt).toBe(NOW + 1000);
  });

  it("ticks and un-ticks", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await assignTask(backend, pregnancyId, ITEM, NOW);

    await setTaskDone(backend, pregnancyId, ITEM, true, NOW + 1000);
    expect(
      (await readTasksFor(backend, PARTNER, pregnancyId))?.[0]?.doneAt,
    ).toBe(NOW + 1000);

    await setTaskDone(backend, pregnancyId, ITEM, false, NOW + 2000);
    expect(
      (await readTasksFor(backend, PARTNER, pregnancyId))?.[0]?.doneAt,
    ).toBeNull();
  });

  it("creates nothing when an unassigned key is ticked", async () => {
    // The update is scoped to (pregnancy, item), so a key the owner never
    // assigned matches no row rather than becoming an assignment she did not make.
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });

    await setTaskDone(backend, pregnancyId, "bolso-ropa", true, NOW);

    expect(await readTasksFor(backend, PARTNER, pregnancyId)).toEqual([]);
  });

  it("takes an item back off the list", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await assignTask(backend, pregnancyId, ITEM, NOW);

    await unassignTask(backend, pregnancyId, ITEM);

    expect(await readTasksFor(backend, PARTNER, pregnancyId)).toEqual([]);
  });

  it("keeps one pregnancy's list out of another's", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    const other = await ensurePregnancyForOwner(backend, "user-other", NOW);
    await assignTask(backend, other, ITEM, NOW);

    expect(await readTasksFor(backend, PARTNER, pregnancyId)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// K2 — ánimos
// ---------------------------------------------------------------------------

describe("ánimos", () => {
  it("reaches the owner, and names her so the route can poke her", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });

    expect(await sendCheer(backend, PARTNER, pregnancyId, "fuerza", NOW)).toBe(
      OWNER,
    );
  });

  it("refuses the owner cheering herself", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });

    expect(
      await sendCheer(backend, OWNER, pregnancyId, "fuerza", NOW),
    ).toBeNull();
    expect(backend.cheers).toEqual([]);
  });

  it("refuses a stranger", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });

    expect(
      await sendCheer(backend, STRANGER, pregnancyId, "fuerza", NOW),
    ).toBeNull();
  });

  it("lets a familiar cheer — this is the one thing both companion roles do", async () => {
    const { backend, pregnancyId } = await setUp({ family: FAMILY });

    expect(await sendCheer(backend, FAMILY, pregnancyId, "fuerza", NOW)).toBe(
      OWNER,
    );
  });

  it("shows the owner her inbox, newest first", async () => {
    const { backend, pregnancyId } = await setUp({
      partner: PARTNER,
      family: FAMILY,
    });
    await sendCheer(backend, PARTNER, pregnancyId, "fuerza", NOW);
    await sendCheer(backend, FAMILY, pregnancyId, "abrazo", NOW + 1000);

    const inbox = await readCheersFor(backend, OWNER, pregnancyId);

    expect(inbox?.map((c) => c.cheerId)).toEqual(["abrazo", "fuerza"]);
  });

  it("gives a companion null — who else has been cheering is not their business", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await sendCheer(backend, PARTNER, pregnancyId, "fuerza", NOW);

    expect(await readCheersFor(backend, PARTNER, pregnancyId)).toBeNull();
  });

  it("pages at CHEER_PAGE_SIZE, because a home screen is not an inbox", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    for (let i = 0; i < CHEER_PAGE_SIZE + 10; i += 1) {
      await sendCheer(backend, PARTNER, pregnancyId, "fuerza", NOW + i);
    }

    const inbox = await readCheersFor(backend, OWNER, pregnancyId);

    expect(inbox).toHaveLength(CHEER_PAGE_SIZE);
    // The newest ones, not the first fifty she ever got.
    expect(inbox?.[0]?.createdAt).toBe(NOW + CHEER_PAGE_SIZE + 9);
  });

  it("marks everything unseen as seen, once", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await sendCheer(backend, PARTNER, pregnancyId, "fuerza", NOW);
    await sendCheer(backend, PARTNER, pregnancyId, "abrazo", NOW + 1);

    await markCheersSeen(backend, pregnancyId, NOW + 5000);

    const inbox = await readCheersFor(backend, OWNER, pregnancyId);
    expect(inbox?.every((c) => c.seenAt === NOW + 5000)).toBe(true);
  });

  it("does not re-stamp a cheer that was already seen", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    await sendCheer(backend, PARTNER, pregnancyId, "fuerza", NOW);
    await markCheersSeen(backend, pregnancyId, NOW + 1000);
    await sendCheer(backend, PARTNER, pregnancyId, "abrazo", NOW + 2000);

    await markCheersSeen(backend, pregnancyId, NOW + 3000);

    const inbox = await readCheersFor(backend, OWNER, pregnancyId);
    expect(inbox?.find((c) => c.cheerId === "fuerza")?.seenAt).toBe(NOW + 1000);
    expect(inbox?.find((c) => c.cheerId === "abrazo")?.seenAt).toBe(NOW + 3000);
  });

  it("keeps one pregnancy's ánimos out of another's", async () => {
    const { backend, pregnancyId } = await setUp({ partner: PARTNER });
    const other = await ensurePregnancyForOwner(backend, "user-other", NOW);
    await sendCheer(backend, PARTNER, pregnancyId, "fuerza", NOW);

    expect(await readCheersFor(backend, "user-other", other)).toEqual([]);
  });

  it("does not send a cheer into a pregnancy that does not exist", async () => {
    const { backend } = await setUp({ partner: PARTNER });

    expect(
      await sendCheer(backend, PARTNER, "no-such-pregnancy", "fuerza", NOW),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The cut itself
// ---------------------------------------------------------------------------

describe("the rules do not reach around the backend", () => {
  it("leaves sharingBackend.ts as the only server module querying these tables", () => {
    // The same discipline as `admin.test.ts`'s privacy scan. Everything above
    // asserts what the rules decide; none of it would notice a shortcut that
    // went straight to Drizzle, because such a shortcut would simply not be
    // exercised by a Map. This would.
    const serverDir = join(process.cwd(), "lib", "server");
    const SHARING_TABLES = [
      "pregnancies",
      "pregnancyMembers",
      "invites",
      "companionSnapshots",
      "companionTasks",
      "companionCheers",
    ];
    /**
     * Everything else that may touch these tables, and why.
     *
     * The list is the point: it is short, every entry is a surface that is not
     * family sharing, and each one has its own test for what it may show. A
     * fourth entry appearing here without an argument beside it is the review
     * this test exists to force — "sharing, but read directly" is exactly the
     * shortcut that would take the rules above out of the tests without failing
     * any of them.
     */
    const ALLOWED = new Map([
      ["sharingBackend.ts", "is the backend"],
      [
        "account.ts",
        "deletes across every table in the schema by design — TABLE_DISPOSITION, " +
          "which account.test.ts holds to the whole schema",
      ],
      [
        "admin.ts",
        "the I-series admin views: metadata about a membership, never a snapshot " +
          "(adminMetrics.test.ts and admin.test.ts scan for the fields)",
      ],
      ["adminMetrics.ts", "aggregate counts only — no row, no id, no name"],
      ["support.ts", "U6's support console: who can see whose pregnancy, as metadata"],
    ]);

    const offenders: string[] = [];
    for (const file of readdirSync(serverDir)) {
      if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
      if (ALLOWED.has(file)) continue;
      const source = readFileSync(join(serverDir, file), "utf8");
      const imports = source.match(/import\s*\{[^}]*\}\s*from\s*"\.\/schema"/s);
      if (!imports) continue;
      for (const table of SHARING_TABLES) {
        if (new RegExp(`\\b${table}\\b`).test(imports[0])) {
          offenders.push(`${file} imports ${table}`);
        }
      }
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("keeps sharing.ts free of Drizzle entirely", () => {
    const source = readFileSync(
      join(process.cwd(), "lib", "server", "sharing.ts"),
      "utf8",
    );
    expect(source).not.toContain("drizzle-orm");
    expect(source).not.toContain('from "./schema"');
  });
});
