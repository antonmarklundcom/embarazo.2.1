import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  RESTORE_WINDOW_DAYS,
  deviceHost,
  devicesOf,
  forceResync,
  membershipsAround,
  recentTombstones,
  removeDevice,
  restoreRecord,
  revokeAllSessions,
  revokeMembership,
  userSyncState,
} from "./support";
import type {
  SupportBackend,
  SupportDeviceRow,
  SupportMembershipRow,
} from "./supportBackend";
import {
  ADMIN_ACTIONS,
  FORBIDDEN_AUDIT_META_FIELDS,
  parseAuditMeta,
} from "@/lib/admin/audit";

// BUILD-PLAN I1 / U6 — the support console's repairs.
//
// The queries themselves need a database and are covered against a real build;
// what is asserted here is the part that is a decision rather than a query, and
// that a future change could quietly undo.

describe("a push endpoint never leaves this module", () => {
  // Anybody holding the endpoint URL can send that phone a notification. It is
  // a bearer secret, so the panel gets the host and nothing else.
  it("reduces an endpoint to its host", () => {
    expect(
      deviceHost("https://fcm.googleapis.com/fcm/send/cXY123:APA91bH-secret"),
    ).toBe("fcm.googleapis.com");
    expect(deviceHost("https://updates.push.services.mozilla.com/wpush/v2/gAAA")).toBe(
      "updates.push.services.mozilla.com",
    );
  });

  it("never returns the secret part, whatever it is handed", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/SECRETTOKEN",
      "not a url at all",
      "",
      "https://host/path?token=SECRETTOKEN",
    ]) {
      expect(deviceHost(endpoint)).not.toContain("SECRETTOKEN");
      expect(deviceHost(endpoint)).not.toContain("/");
    }
  });

  it("answers something printable for a malformed endpoint", () => {
    // Stored endpoints are data we did not write, so the failure lands here
    // rather than as a thrown error on an admin's screen.
    expect(deviceHost("not a url at all")).toBe("desconocido");
  });

  it("is the only way the page can name a device", () => {
    // `devicesOf` drops the endpoint before returning, so a caller cannot
    // render one by accident even if it wanted to.
    const source = readFileSync(join(process.cwd(), "lib", "server", "support.ts"), "utf8");
    const fn = source.slice(source.indexOf("export async function devicesOf"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("deviceHost(row.endpoint)");
    // The returned shape has a host, not an endpoint.
    expect(body).not.toMatch(/endpoint:\s*row\.endpoint/);
  });
});

describe("the console cannot read what it restores", () => {
  it("never names a record body anywhere in the module", () => {
    // The A7 rule, held to by this module the same way `admin.ts` is: it can
    // clear a tombstone, it cannot look at one.
    const source = readFileSync(join(process.cwd(), "lib", "server", "support.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(source).not.toMatch(/\bpayload\b/);
    expect(source).not.toMatch(/\bphotoBlobs\b/);
    expect(source).not.toMatch(/\bcompanionSnapshots\b/);
  });

  it("offers a bounded window, and says it is a display filter", () => {
    // Nothing purges tombstones, so this is about what is useful to look at,
    // not about what is retained.
    expect(RESTORE_WINDOW_DAYS).toBe(30);
  });
});

describe("every repair is audited, and carries ids only", () => {
  it("names the five new actions", () => {
    for (const action of [
      "member_revoked",
      "device_removed",
      "sessions_revoked",
      "resync_forced",
      "record_restored",
    ] as const) {
      expect(ADMIN_ACTIONS).toContain(action);
    }
  });

  it("accepts exactly the meta each one is allowed", () => {
    expect(
      parseAuditMeta("member_revoked", { pregnancyId: "p1", memberUserId: "u2" }),
    ).toEqual({ pregnancyId: "p1", memberUserId: "u2" });
    expect(parseAuditMeta("device_removed", { subscriptionId: "s1" })).toEqual({
      subscriptionId: "s1",
    });
    expect(parseAuditMeta("sessions_revoked", {})).toEqual({});
    expect(parseAuditMeta("resync_forced", {})).toEqual({});
    expect(
      parseAuditMeta("record_restored", { store: "weightEntries", recordId: "w1" }),
    ).toEqual({ store: "weightEntries", recordId: "w1" });
  });

  it("rejects anything else, so a careless payload cannot outlive the user", () => {
    // `adminAudit` is the one table deletion retains (A5), which is why the
    // shapes are strict rather than advisory.
    expect(() =>
      parseAuditMeta("device_removed", { subscriptionId: "s1", endpoint: "https://x" }),
    ).toThrow();
    expect(() => parseAuditMeta("sessions_revoked", { email: "a@b.c" })).toThrow();
    expect(() =>
      parseAuditMeta("record_restored", {
        store: "weightEntries",
        recordId: "w1",
        kg: 61,
      }),
    ).toThrow();
    expect(() => parseAuditMeta("member_revoked", { pregnancyId: "p1" })).toThrow();
  });

  it("carries none of the forbidden fields in its declared shapes", () => {
    const source = readFileSync(join(process.cwd(), "lib", "admin", "audit.ts"), "utf8");
    const schemas = source.slice(
      source.indexOf("export const AUDIT_META_SCHEMAS"),
      source.indexOf("export const FORBIDDEN_AUDIT_META_FIELDS"),
    );
    for (const field of FORBIDDEN_AUDIT_META_FIELDS) {
      expect(
        new RegExp(`\\b${field}\\s*:`).test(schemas),
        `an audit payload must not carry "${field}"`,
      ).toBe(false);
    }
  });
});

describe("revocation is a real end to a session, not a hint", () => {
  const auth = readFileSync(join(process.cwd(), "lib", "server", "auth.ts"), "utf8");

  it("stamps the version into the token at sign-in", () => {
    expect(auth).toContain("token.sessionVersion = await currentSessionVersion");
  });

  it("compares it on every session read", () => {
    // Without this comparison the column is decoration: a JWT keeps resolving
    // to its user until it expires, whatever the database says.
    expect(auth).toMatch(/token\.sessionVersion !== current/);
  });

  it("leaves the session alone when the version cannot be read", () => {
    // A revocation feature that signs the whole userbase out during a database
    // hiccup is worse than one that is late.
    const fn = auth.slice(auth.indexOf("async function currentSessionVersion"));
    const body = fn.slice(0, fn.indexOf("\n}\n"));
    expect(body).toContain("return null");
    expect(body).toContain("catch");
  });
});

// ---------------------------------------------------------------------------
// W5 — the five repairs, over a Map
// ---------------------------------------------------------------------------
//
// These run the real `lib/server/support.ts` — the same functions the admin
// actions and `/api/v1/sync` call, unmodified — with a Map underneath instead
// of MySQL, the same cut A3's `sync.test.ts` and V2's `sharing.test.ts` use.

interface MemoryMember extends SupportMembershipRow {
  userId: string;
}

function memoryBackend(): SupportBackend & {
  pregnancies: Map<string, { id: string; ownerUserId: string }>;
  members: Map<string, MemoryMember>;
  users: Map<string, { sessionVersion: number; syncEpoch: number }>;
  devices: Map<string, SupportDeviceRow & { userId: string }>;
  syncRows: Map<string, { userId: string; store: string; recordId: string; deletedAt: number | null }>;
} {
  const pregnancies = new Map<string, { id: string; ownerUserId: string }>();
  const members = new Map<string, MemoryMember>();
  const users = new Map<string, { sessionVersion: number; syncEpoch: number }>();
  const devices = new Map<string, SupportDeviceRow & { userId: string }>();
  const syncRows = new Map<
    string,
    { userId: string; store: string; recordId: string; deletedAt: number | null }
  >();
  const syncKey = (userId: string, store: string, recordId: string) =>
    `${userId}|${store}|${recordId}`;

  return {
    pregnancies,
    members,
    users,
    devices,
    syncRows,

    async ownedPregnancyIds(userId) {
      return [...pregnancies.values()]
        .filter((row) => row.ownerUserId === userId)
        .map((row) => row.id);
    },

    async membershipRows(userId, ownedPregnancyIds) {
      const owned = new Set(ownedPregnancyIds);
      return [...members.values()]
        .filter((row) => row.userId === userId || owned.has(row.pregnancyId))
        .map(({ userId: memberUserId, ...rest }) => ({ ...rest, memberUserId }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async findMembership(membershipId) {
      const row = members.get(membershipId);
      return row
        ? { id: row.id, pregnancyId: row.pregnancyId, memberUserId: row.userId }
        : null;
    },

    async revokeMembershipIfLive(membershipId, at) {
      const row = members.get(membershipId);
      // Scoped to a live membership, like the UPDATE's WHERE clause: a second
      // revoke does not push the timestamp forward.
      if (row && row.revokedAt === null) row.revokedAt = at;
    },

    async devicesOf(userId) {
      return [...devices.values()]
        .filter((row) => row.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    async findDevice(userId, subscriptionId) {
      const row = devices.get(subscriptionId);
      return row && row.userId === userId ? { id: row.id } : null;
    },

    async deleteDevice(subscriptionId) {
      devices.delete(subscriptionId);
    },

    async bumpSessionVersion(userId) {
      const row = users.get(userId);
      if (row) row.sessionVersion += 1;
    },

    async bumpSyncEpoch(userId) {
      const row = users.get(userId);
      if (row) row.syncEpoch += 1;
    },

    async syncState(userId) {
      const row = users.get(userId);
      return row ? { ...row } : null;
    },

    async tombstonesSince(userId, since) {
      return [...syncRows.values()]
        .filter(
          (row): row is typeof row & { deletedAt: number } =>
            row.userId === userId && row.deletedAt !== null && row.deletedAt >= since,
        )
        .sort((a, b) => b.deletedAt - a.deletedAt)
        .map((row) => ({ store: row.store, recordId: row.recordId, deletedAt: row.deletedAt }));
    },

    async hasTombstone(userId, store, recordId) {
      const row = syncRows.get(syncKey(userId, store, recordId));
      return row !== undefined && row.deletedAt !== null;
    },

    async restoreTombstone(userId, store, recordId) {
      const row = syncRows.get(syncKey(userId, store, recordId));
      if (row) row.deletedAt = null;
    },
  };
}

const OWNER = "user-owner";
const MEMBER = "user-member";
const STRANGER = "user-stranger";
const NOW = 1_760_000_000_000;

describe("who can see whose pregnancy", () => {
  function seedMembership(
    backend: ReturnType<typeof memoryBackend>,
    row: { id: string; pregnancyId: string; userId: string; ownerUserId: string },
  ): void {
    backend.pregnancies.set(row.pregnancyId, {
      id: row.pregnancyId,
      ownerUserId: row.ownerUserId,
    });
    backend.members.set(row.id, {
      id: row.id,
      pregnancyId: row.pregnancyId,
      userId: row.userId,
      memberUserId: row.userId,
      memberEmail: null,
      role: "partner",
      createdAt: new Date(NOW),
      revokedAt: null,
    });
  }

  it("shows both directions: who sees her, and whose she sees", async () => {
    const backend = memoryBackend();
    seedMembership(backend, { id: "m-her-partner", pregnancyId: "p-owner", userId: MEMBER, ownerUserId: OWNER });
    seedMembership(backend, { id: "m-owner-owns", pregnancyId: "p-owner", userId: OWNER, ownerUserId: OWNER });

    const rows = await membershipsAround(backend, OWNER);

    const partnerRow = rows.find((r) => r.memberUserId === MEMBER);
    expect(partnerRow?.ownedByThisUser).toBe(true);
  });

  it("marks a membership of somebody else's pregnancy as not owned by this user", async () => {
    const backend = memoryBackend();
    seedMembership(backend, { id: "m-elsewhere", pregnancyId: "p-other", userId: OWNER, ownerUserId: "user-other" });

    const rows = await membershipsAround(backend, OWNER);

    expect(rows).toEqual([expect.objectContaining({ ownedByThisUser: false })]);
  });

  it("cuts a member off, immediately", async () => {
    const backend = memoryBackend();
    seedMembership(backend, { id: "m1", pregnancyId: "p-owner", userId: MEMBER, ownerUserId: OWNER });

    const revoked = await revokeMembership(backend, "m1");

    expect(revoked).toEqual({ pregnancyId: "p-owner", memberUserId: MEMBER });
    expect(backend.members.get("m1")?.revokedAt).not.toBeNull();
  });

  it("is idempotent: a second click changes nothing further", async () => {
    const backend = memoryBackend();
    seedMembership(backend, { id: "m1", pregnancyId: "p-owner", userId: MEMBER, ownerUserId: OWNER });
    await revokeMembership(backend, "m1");
    const firstRevokedAt = backend.members.get("m1")!.revokedAt;

    const second = await revokeMembership(backend, "m1");

    expect(second).toEqual({ pregnancyId: "p-owner", memberUserId: MEMBER });
    expect(backend.members.get("m1")?.revokedAt).toEqual(firstRevokedAt);
  });

  it("reports a membership id nobody has as not found, not as an error", async () => {
    const backend = memoryBackend();

    expect(await revokeMembership(backend, "no-such-id")).toBeNull();
  });
});

describe("devices and sessions", () => {
  it("forgets a device, so it stops receiving pokes", async () => {
    const backend = memoryBackend();
    backend.devices.set("d1", { id: "d1", userId: OWNER, endpoint: "https://fcm.googleapis.com/x", createdAt: new Date(NOW), lastSeenAt: null });

    const removed = await removeDevice(backend, OWNER, "d1");

    expect(removed).toBe(true);
    expect(backend.devices.has("d1")).toBe(false);
  });

  it("refuses to remove a device that belongs to another account", async () => {
    const backend = memoryBackend();
    backend.devices.set("d1", { id: "d1", userId: OWNER, endpoint: "https://fcm.googleapis.com/x", createdAt: new Date(NOW), lastSeenAt: null });

    const removed = await removeDevice(backend, STRANGER, "d1");

    expect(removed).toBe(false);
    expect(backend.devices.has("d1")).toBe(true);
  });

  it("reports a subscription id that does not exist as not found", async () => {
    const backend = memoryBackend();

    expect(await removeDevice(backend, OWNER, "no-such-device")).toBe(false);
  });

  it("never renders the host of a device it drops from the wrong account", async () => {
    // devicesOf itself never returns the endpoint, only its host, for every
    // account — including a stranger's own devices, which it must not mix in.
    const backend = memoryBackend();
    backend.devices.set("d1", { id: "d1", userId: OWNER, endpoint: "https://fcm.googleapis.com/x", createdAt: new Date(NOW), lastSeenAt: null });

    const devices = await devicesOf(backend, STRANGER);

    expect(devices).toEqual([]);
  });

  it("bumps the session version, ending every open session", async () => {
    const backend = memoryBackend();
    backend.users.set(OWNER, { sessionVersion: 1, syncEpoch: 1 });

    await revokeAllSessions(backend, OWNER);

    expect(await userSyncState(backend, OWNER)).toEqual({ sessionVersion: 2, syncEpoch: 1 });
  });

  it("bumps the sync epoch, telling every device to pull everything again", async () => {
    const backend = memoryBackend();
    backend.users.set(OWNER, { sessionVersion: 1, syncEpoch: 1 });

    await forceResync(backend, OWNER);

    expect(await userSyncState(backend, OWNER)).toEqual({ sessionVersion: 1, syncEpoch: 2 });
  });

  it("reports no sync state for an account that does not exist", async () => {
    const backend = memoryBackend();

    expect(await userSyncState(backend, "no-such-user")).toBeNull();
  });
});

describe("lost data", () => {
  it("lists a tombstone inside the restore window", async () => {
    const backend = memoryBackend();
    backend.syncRows.set(`${OWNER}|weightEntries|w1`, {
      userId: OWNER,
      store: "weightEntries",
      recordId: "w1",
      deletedAt: NOW - 5 * 86_400_000,
    });

    const rows = await recentTombstones(backend, OWNER, NOW);

    expect(rows).toEqual([{ store: "weightEntries", recordId: "w1", deletedAt: NOW - 5 * 86_400_000 }]);
  });

  it("does not list a tombstone older than the restore window", async () => {
    const backend = memoryBackend();
    backend.syncRows.set(`${OWNER}|weightEntries|w1`, {
      userId: OWNER,
      store: "weightEntries",
      recordId: "w1",
      deletedAt: NOW - (RESTORE_WINDOW_DAYS + 1) * 86_400_000,
    });

    expect(await recentTombstones(backend, OWNER, NOW)).toEqual([]);
  });

  it("does not list a live (non-deleted) record as a tombstone", async () => {
    const backend = memoryBackend();
    backend.syncRows.set(`${OWNER}|weightEntries|w1`, {
      userId: OWNER,
      store: "weightEntries",
      recordId: "w1",
      deletedAt: null,
    });

    expect(await recentTombstones(backend, OWNER, NOW)).toEqual([]);
  });

  it("restores a deleted record", async () => {
    const backend = memoryBackend();
    backend.syncRows.set(`${OWNER}|weightEntries|w1`, {
      userId: OWNER,
      store: "weightEntries",
      recordId: "w1",
      deletedAt: NOW - 1000,
    });

    const restored = await restoreRecord(backend, OWNER, "weightEntries", "w1", NOW);

    expect(restored).toBe(true);
    expect(backend.syncRows.get(`${OWNER}|weightEntries|w1`)?.deletedAt).toBeNull();
  });

  it("refuses to restore a record that is not deleted", async () => {
    const backend = memoryBackend();
    backend.syncRows.set(`${OWNER}|weightEntries|w1`, {
      userId: OWNER,
      store: "weightEntries",
      recordId: "w1",
      deletedAt: null,
    });

    expect(await restoreRecord(backend, OWNER, "weightEntries", "w1", NOW)).toBe(false);
  });

  it("reports a record nobody deleted as not found", async () => {
    const backend = memoryBackend();

    expect(await restoreRecord(backend, OWNER, "weightEntries", "no-such-record", NOW)).toBe(false);
  });
});
