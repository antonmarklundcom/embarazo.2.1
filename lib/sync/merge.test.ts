import { describe, expect, it } from "vitest";

import {
  WITHHELD_NOTE,
  applyPayload,
  mergeIncoming,
  serverAccepts,
  toPayload,
  type LocalRow,
  type SyncEnvelope,
} from "./merge";
import {
  SINGLETON_RECORD_ID,
  SYNCED_STORES,
  UNSYNCED_STORES,
  isSingletonStore,
  recordIdFor,
} from "./stores";

// BUILD-PLAN A3. These cover the rule, not the plumbing: which version of a
// record survives, what leaves the device, and what happens to the loser.

function envelope(over: Partial<SyncEnvelope> = {}): SyncEnvelope {
  return {
    store: "journalEntries",
    recordId: "rec-1",
    updatedAt: 1_000,
    deletedAt: null,
    payload: { week: 12, symptoms: [], note: "remoto", createdAt: 900 },
    ...over,
  };
}

function local(over: Partial<LocalRow> = {}): LocalRow {
  return {
    id: 7,
    uid: "rec-1",
    updatedAt: 1_000,
    deletedAt: null,
    dirty: 0,
    week: 12,
    symptoms: [],
    note: "local",
    createdAt: 900,
    ...over,
  };
}

describe("the stores that sync (§4.4)", () => {
  it("never includes photos", () => {
    for (const store of SYNCED_STORES) {
      expect(store.toLowerCase()).not.toContain("photo");
      expect(store.toLowerCase()).not.toContain("carne");
    }
    expect(UNSYNCED_STORES).toContain("photoEntries");
    expect(UNSYNCED_STORES).toContain("carnePhotos");
  });

  it("does not overlap the unsynced list", () => {
    for (const store of UNSYNCED_STORES) {
      expect(SYNCED_STORES as readonly string[]).not.toContain(store);
    }
  });
});

describe("record ids are stable across devices", () => {
  it("gives every singleton store the same fixed id", () => {
    for (const store of SYNCED_STORES) {
      if (!isSingletonStore(store)) continue;
      expect(recordIdFor(store, {}, () => "random")).toBe(SINGLETON_RECORD_ID);
    }
  });

  it("keys the checklist by its own key, so two devices tick one record", () => {
    const a = recordIdFor("checklistState", { key: "carne" }, () => "random-a");
    const b = recordIdFor("checklistState", { key: "carne" }, () => "random-b");
    expect(a).toBe(b);
    expect(a).toBe("key:carne");
  });

  it("falls back to a random id where there is no natural key", () => {
    expect(recordIdFor("weightEntries", { kg: 60 }, () => "random")).toBe(
      "random",
    );
  });
});

describe("toPayload", () => {
  it("strips sync bookkeeping and Dexie's per-device id", () => {
    const payload = toPayload("weightEntries", {
      id: 3,
      uid: "u",
      updatedAt: 5,
      deletedAt: null,
      dirty: 1,
      date: 100,
      kg: 61.2,
    });
    expect(payload).toEqual({ date: 100, kg: 61.2 });
  });

  it("sends no body at all for a deleted record", () => {
    expect(toPayload("weightEntries", local({ deletedAt: 2_000 }))).toBeNull();
  });

  it("withholds a PIN-encrypted note but still syncs the record", () => {
    const payload = toPayload(
      "journalEntries",
      local({ note: "cifrado", noteEncrypted: true }),
    );
    expect(payload).not.toBeNull();
    expect(payload).not.toHaveProperty("note");
    expect(payload![WITHHELD_NOTE]).toBe(true);
    // The rest of the record still travels — week, symptoms, mood.
    expect(payload!.week).toBe(12);
  });
});

describe("last-write-wins", () => {
  it("inserts a record it has never seen", () => {
    const result = mergeIncoming("journalEntries", envelope(), undefined);
    expect(result.apply).toBe(true);
    expect(result.reason).toBe("insert");
    expect(result.row?.dirty).toBe(0);
  });

  it("applies a strictly newer remote record", () => {
    const result = mergeIncoming(
      "journalEntries",
      envelope({ updatedAt: 2_000 }),
      local({ updatedAt: 1_000 }),
    );
    expect(result.apply).toBe(true);
    expect(result.reason).toBe("remote-newer");
    expect(result.row?.note).toBe("remoto");
  });

  it("keeps a strictly newer local record", () => {
    const result = mergeIncoming(
      "journalEntries",
      envelope({ updatedAt: 1_000 }),
      local({ updatedAt: 2_000 }),
    );
    expect(result.apply).toBe(false);
    expect(result.reason).toBe("local-newer");
  });

  it("keeps local on an exact tie, so a round trip is not a rewrite", () => {
    const result = mergeIncoming(
      "journalEntries",
      envelope({ updatedAt: 1_000 }),
      local({ updatedAt: 1_000, note: "local" }),
    );
    expect(result.apply).toBe(false);
    expect(result.reason).toBe("same-timestamp");
  });

  it("preserves the Dexie primary key so applying is an update, not a copy", () => {
    const result = mergeIncoming(
      "journalEntries",
      envelope({ updatedAt: 2_000 }),
      local({ id: 7 }),
    );
    expect(result.row?.id).toBe(7);
  });

  it("lets a later edit resurrect a deleted record", () => {
    // Deletion is not privileged: it is a write like any other.
    const deleted = local({ deletedAt: 1_500, updatedAt: 1_500 });
    const edit = envelope({ updatedAt: 2_000, deletedAt: null });
    const result = mergeIncoming("journalEntries", edit, deleted);
    expect(result.apply).toBe(true);
    expect(result.row?.deletedAt).toBeNull();
  });

  it("propagates a delete that happened later", () => {
    const result = mergeIncoming(
      "weightEntries",
      envelope({
        store: "weightEntries",
        updatedAt: 3_000,
        deletedAt: 3_000,
        payload: null,
      }),
      local({ updatedAt: 1_000 }),
    );
    expect(result.apply).toBe(true);
    expect(result.row?.deletedAt).toBe(3_000);
  });

  it("agrees with the server-side comparison", () => {
    expect(serverAccepts(2, 1)).toBe(true);
    expect(serverAccepts(1, 2)).toBe(false);
    expect(serverAccepts(1, 1)).toBe(false);
    expect(serverAccepts(1, undefined)).toBe(true);
  });
});

describe("conflicts are kept, never dropped", () => {
  it("keeps the losing note when a dirty local journal entry loses", () => {
    const result = mergeIncoming(
      "journalEntries",
      envelope({ updatedAt: 2_000, payload: { note: "remoto", week: 12 } }),
      local({ updatedAt: 1_000, dirty: 1, note: "lo que escribí yo" }),
    );
    expect(result.apply).toBe(true);
    expect(result.conflict).not.toBeNull();
    expect(result.conflict?.localPayload?.note).toBe("lo que escribí yo");
    expect(result.conflict?.remoteUpdatedAt).toBe(2_000);
  });

  it("raises a conflict even when the local copy was already pushed", () => {
    // The `dirty` flag is deliberately NOT the test: device A can write a
    // note, sync it clean, and still have it overwritten by a device that
    // never saw it. See the comment on conflictFor.
    const result = mergeIncoming(
      "journalEntries",
      envelope({ updatedAt: 2_000 }),
      local({ updatedAt: 1_000, dirty: 0, note: "vieja" }),
    );
    expect(result.apply).toBe(true);
    expect(result.conflict?.localPayload?.note).toBe("vieja");
  });

  it("raises nothing when this device had no note to lose", () => {
    const result = mergeIncoming(
      "journalEntries",
      envelope({ updatedAt: 2_000 }),
      local({ updatedAt: 1_000, note: "" }),
    );
    expect(result.apply).toBe(true);
    expect(result.conflict).toBeNull();
  });

  it("does not raise a conflict when both notes are the same text", () => {
    const result = mergeIncoming(
      "journalEntries",
      envelope({ updatedAt: 2_000, payload: { note: "igual" } }),
      local({ updatedAt: 1_000, dirty: 1, note: "igual" }),
    );
    expect(result.conflict).toBeNull();
  });

  it("never raises a conflict outside the journal", () => {
    const result = mergeIncoming(
      "weightEntries",
      envelope({ store: "weightEntries", updatedAt: 2_000, payload: { kg: 61 } }),
      local({ updatedAt: 1_000, dirty: 1, kg: 60 }),
    );
    expect(result.apply).toBe(true);
    expect(result.conflict).toBeNull();
  });
});

describe("a withheld note never destroys the note this device holds", () => {
  it("keeps the local encrypted note when the remote copy withheld its own", () => {
    const row = applyPayload(
      "journalEntries",
      envelope({
        updatedAt: 2_000,
        payload: { week: 13, [WITHHELD_NOTE]: true },
      }),
      local({ note: "cifrado local", noteEncrypted: true }),
    );
    expect(row.note).toBe("cifrado local");
    expect(row.noteEncrypted).toBe(true);
    expect(row.week).toBe(13);
    expect(row[WITHHELD_NOTE]).toBeUndefined();
  });

  it("leaves an empty note where this device never had one", () => {
    const row = applyPayload(
      "journalEntries",
      envelope({ updatedAt: 2_000, payload: { week: 13, [WITHHELD_NOTE]: true } }),
      undefined,
    );
    expect(row.note).toBe("");
    expect(row[WITHHELD_NOTE]).toBe(true);
  });

  it("does not raise a conflict merely because a note was withheld", () => {
    const result = mergeIncoming(
      "journalEntries",
      envelope({ updatedAt: 2_000, payload: { [WITHHELD_NOTE]: true } }),
      local({ updatedAt: 1_000, dirty: 1, note: "mía", noteEncrypted: true }),
    );
    expect(result.conflict).toBeNull();
    expect(result.row?.note).toBe("mía");
  });
});
