import { beforeAll, describe, expect, it } from "vitest";

import { mysqlEnabled } from "./setup";

// F06 and F20 against a real MySQL/MariaDB, with the same controlled
// interleaving the review used to reproduce them: a pause injected right after
// `acceptInvite` reads the live membership, while the owner revokes.

describe.skipIf(!mysqlEnabled)("sharing on a real database", () => {
  let sharing: typeof import("@/lib/server/sharing");
  let backendModule: typeof import("@/lib/server/sharingBackend");
  let dbModule: typeof import("@/lib/server/db");

  beforeAll(async () => {
    sharing = await import("@/lib/server/sharing");
    backendModule = await import("@/lib/server/sharingBackend");
    dbModule = await import("@/lib/server/db");
  });

  const real = () => backendModule.drizzleSharingBackend(dbModule.db());

  function pausedAfterRead() {
    let open!: () => void;
    let reached!: () => void;
    const gate = new Promise<void>((r) => (open = r));
    const atPause = new Promise<void>((r) => (reached = r));
    const base = real();
    const backend = {
      ...base,
      async liveMembership(userId: string, pregnancyId: string) {
        const row = await base.liveMembership(userId, pregnancyId);
        reached();
        await gate;
        return row;
      },
    };
    return { backend, atPause, open };
  }

  it("F06: an invite revoked after acceptance read it grants nothing", async () => {
    const preg = await sharing.ensurePregnancyForOwner(real(), "owner-a", Date.now());
    const invite = await sharing.createInvite(real(), preg, "owner-a", "partner", Date.now());
    const { backend, atPause, open } = pausedAfterRead();

    const pending = sharing.acceptInvite(backend, invite.code, "companion-a", Date.now());
    await atPause;
    await sharing.revokeInviteCode(real(), preg, invite.code);
    open();

    expect(await pending).toEqual({ ok: false, reason: "revoked" });
    expect(await sharing.membershipsOf(real(), "companion-a")).toEqual([]);
  });

  it("F06: a re-tap during the member's removal does not undo it", async () => {
    const preg = await sharing.ensurePregnancyForOwner(real(), "owner-b", Date.now());
    const invite = await sharing.createInvite(real(), preg, "owner-b", "partner", Date.now());
    expect((await sharing.acceptInvite(real(), invite.code, "companion-b", Date.now())).ok).toBe(true);
    const { backend, atPause, open } = pausedAfterRead();

    const pending = sharing.acceptInvite(backend, invite.code, "companion-b", Date.now());
    await atPause;
    await sharing.revokeMembership(real(), preg, "companion-b");
    open();
    await pending;

    expect(await sharing.membershipsOf(real(), "companion-b")).toEqual([]);
  });

  it("F06: two people racing one link — exactly one gets in", async () => {
    const preg = await sharing.ensurePregnancyForOwner(real(), "owner-c", Date.now());
    const invite = await sharing.createInvite(real(), preg, "owner-c", "family", Date.now());
    const outcomes = await Promise.all(
      ["x", "y", "z"].map((who) => sharing.acceptInvite(real(), invite.code, `companion-${who}`, Date.now())),
    );
    expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
  });

  it("F20: a failed owner-row write is repaired by the next call", async () => {
    const base = real();
    let failNext = true;
    const flaky = {
      ...base,
      async upsertMembership(row: Parameters<typeof base.upsertMembership>[0]) {
        if (failNext) {
          failNext = false;
          throw new Error("simulated connection drop");
        }
        return base.upsertMembership(row);
      },
    };
    await expect(sharing.ensurePregnancyForOwner(flaky, "owner-d", Date.now())).rejects.toThrow("simulated");

    const id = await sharing.ensurePregnancyForOwner(flaky, "owner-d", Date.now());

    expect(await sharing.membershipsOf(real(), "owner-d")).toEqual([
      expect.objectContaining({ pregnancyId: id, role: "owner" }),
    ]);
  });

  it("F20: concurrent first calls agree on one pregnancy and one owner row", async () => {
    const ids = await Promise.all(
      Array.from({ length: 6 }, () => sharing.ensurePregnancyForOwner(real(), "owner-e", Date.now())),
    );
    expect(new Set(ids).size).toBe(1);
    expect(await sharing.membershipsOf(real(), "owner-e")).toHaveLength(1);
  });
});
