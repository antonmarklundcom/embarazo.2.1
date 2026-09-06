import { describe, expect, it } from "vitest";

import { applyPayload, mergeIncoming, type LocalRow, type SyncEnvelope } from "./merge";

// BUILD-PLAN I1 / U6 — the un-delete, which is the most dangerous thing the
// support console can do and the reason `merge.ts` grew a rule for it.
//
// The shape of the danger, spelled out because a future change could silently
// reintroduce it: `restoreRecord` clears `deletedAt` and stamps `updatedAt`
// with `now`, so the restored row WINS last-write-wins on every device the
// account owns. The row carries no body — `toPayload` drops the payload of a
// deleted record on purpose, so the server never holds the contents of
// something the user deleted. Spreading that empty payload over a device's
// intact record would replace her data with `{}`, on every phone at once, and
// the feature whose entire purpose is recovering a woman's records would be
// the thing that destroyed them.

const RESTORE: SyncEnvelope = {
  store: "weightEntries",
  recordId: "w-1",
  updatedAt: 5_000,
  deletedAt: null,
  payload: null,
};

describe("an un-delete never destroys the body a device still holds", () => {
  it("keeps every field of the local row", () => {
    const local: LocalRow = {
      id: 7,
      uid: "w-1",
      updatedAt: 1_000,
      deletedAt: 2_000,
      dirty: 0,
      kg: 61.5,
      date: 1_700_000_000,
    };

    const row = applyPayload("weightEntries", RESTORE, local);

    expect(row.kg).toBe(61.5);
    expect(row.date).toBe(1_700_000_000);
    // The record is alive again, at the restore's clock, and Dexie's key is
    // kept so this is an update rather than a duplicate insert.
    expect(row.deletedAt).toBeNull();
    expect(row.updatedAt).toBe(5_000);
    expect(row.id).toBe(7);
    expect(row.dirty).toBe(0);
  });

  it("carries no sync bookkeeping across from the old row", () => {
    // `bodyOf` must strip the engine's own fields, or a stale `deletedAt`
    // would ride along and un-delete nothing.
    const local: LocalRow = {
      uid: "w-1",
      updatedAt: 1_000,
      deletedAt: 2_000,
      dirty: 1,
      kg: 61.5,
    };
    const row = applyPayload("weightEntries", RESTORE, local);
    expect(row.deletedAt).toBeNull();
    expect(row.dirty).toBe(0);
    expect(row.updatedAt).toBe(5_000);
  });

  it("wins the merge against the delete the device already applied", () => {
    const local: LocalRow = {
      uid: "w-1",
      updatedAt: 2_000,
      deletedAt: 2_000,
      dirty: 0,
      kg: 61.5,
    };

    const result = mergeIncoming("weightEntries", RESTORE, local);

    expect(result.apply).toBe(true);
    expect(result.reason).toBe("remote-newer");
    expect(result.row?.kg).toBe(61.5);
    expect(result.row?.deletedAt).toBeNull();
  });

  it("does nothing on a device that never held the record", () => {
    // An empty row for a record this phone has never seen is not a recovery.
    const result = mergeIncoming("weightEntries", RESTORE, undefined);
    expect(result.apply).toBe(false);
    expect(result.reason).toBe("nothing-to-restore");
    expect(result.row).toBeNull();
  });

  it("does not ask her to resolve a conflict against nothing", () => {
    const local: LocalRow = {
      uid: "j-1",
      updatedAt: 2_000,
      deletedAt: 2_000,
      dirty: 0,
      note: "me sentí mal el martes",
    };

    const result = mergeIncoming(
      "journalEntries",
      { ...RESTORE, store: "journalEntries", recordId: "j-1" },
      local,
    );

    expect(result.apply).toBe(true);
    expect(result.row?.note).toBe("me sentí mal el martes");
    // The note is preserved, so there is no losing version to surface.
    expect(result.conflict).toBeNull();
  });
});

describe("the rule cannot fire on an ordinary record", () => {
  it("a live record WITH a payload still overwrites, as it always did", () => {
    const local: LocalRow = {
      uid: "w-1",
      updatedAt: 1_000,
      deletedAt: null,
      dirty: 0,
      kg: 61.5,
    };

    const result = mergeIncoming(
      "weightEntries",
      { ...RESTORE, payload: { kg: 62.0 } },
      local,
    );

    expect(result.apply).toBe(true);
    expect(result.row?.kg).toBe(62.0);
  });

  it("a DELETE with a null payload still deletes", () => {
    // Deletes also carry `payload: null`. They are distinguished by
    // `deletedAt`, so the restore rule must not swallow them.
    const local: LocalRow = {
      uid: "w-1",
      updatedAt: 1_000,
      deletedAt: null,
      dirty: 0,
      kg: 61.5,
    };

    const result = mergeIncoming(
      "weightEntries",
      { ...RESTORE, deletedAt: 4_000, payload: null },
      local,
    );

    expect(result.apply).toBe(true);
    expect(result.row?.deletedAt).toBe(4_000);
  });

  it("an insert of a normal record is untouched", () => {
    const result = mergeIncoming(
      "weightEntries",
      { ...RESTORE, payload: { kg: 62.0 } },
      undefined,
    );
    expect(result.apply).toBe(true);
    expect(result.reason).toBe("insert");
    expect(result.row?.kg).toBe(62.0);
  });
});
