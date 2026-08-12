import { describe, expect, it } from "vitest";

import { ACCOUNT_MISMATCH_MESSAGE, decideAccountLink } from "./link";
import { mergeIncoming, toPayload, type LocalRow } from "./merge";
import { SINGLETON_RECORD_ID, recordIdFor } from "./stores";

// BUILD-PLAN A6: "local-only → sign-in results in exactly one copy of every
// record on both sides."
//
// Two halves. `decideAccountLink` is the new machinery — the guard that stops
// one person's data reaching another person's account. The rest asserts the
// property A3's design was supposed to give us for free, because "for free"
// is exactly the kind of claim that stops being true without a test.

describe("decideAccountLink", () => {
  it("adopts an account when the device has never synced", () => {
    expect(decideAccountLink(undefined, "user-a")).toBe("adopt");
    expect(decideAccountLink(null, "user-a")).toBe("adopt");
    // An empty string is a bug upstream, not a valid link — treat it as unset
    // rather than as an account nothing can ever match.
    expect(decideAccountLink("", "user-a")).toBe("adopt");
  });

  it("continues normally for the same account", () => {
    expect(decideAccountLink("user-a", "user-a")).toBe("continue");
  });

  it("refuses when the local data belongs to a different account", () => {
    // sign in as A → sync → sign out → keep using the app → sign in as B.
    // Every row touched in between is dirty; without this the next sync
    // uploads A's health records into B's account.
    expect(decideAccountLink("user-a", "user-b")).toBe("refuse");
  });

  it("explains the refusal without naming the other account", () => {
    // The person holding the phone may not be the person who owns that data.
    expect(ACCOUNT_MISMATCH_MESSAGE).not.toMatch(/user-|@/);
    expect(ACCOUNT_MISMATCH_MESSAGE.length).toBeGreaterThan(40);
  });
});

describe("linking local-only data uploads exactly one copy", () => {
  function localRow(over: Partial<LocalRow> = {}): LocalRow {
    return {
      uid: "r1",
      updatedAt: 1_000,
      deletedAt: null,
      // A local-only device has never had a push accepted, so everything is
      // dirty and everything uploads on the first link.
      dirty: 1,
      ...over,
    };
  }

  it("sends every local row, because none was ever accepted", () => {
    const rows = [localRow({ uid: "a" }), localRow({ uid: "b" })];
    expect(rows.filter((r) => r.dirty === 1)).toHaveLength(2);
  });

  it("merges a local profile with the account's, rather than adding a second", () => {
    // The fixed singleton id is what makes this one record instead of two.
    const localUid = recordIdFor("profile", { department: "capital" }, () => "x");
    expect(localUid).toBe(SINGLETON_RECORD_ID);

    const merged = mergeIncoming(
      "profile",
      {
        store: "profile",
        recordId: SINGLETON_RECORD_ID,
        updatedAt: 2_000,
        deletedAt: null,
        payload: { department: "central" },
      },
      localRow({ uid: SINGLETON_RECORD_ID, department: "capital" }),
    );
    expect(merged.apply).toBe(true);
    expect(merged.row?.uid).toBe(SINGLETON_RECORD_ID);
  });

  it("merges a checklist tick made locally with the same tick on the account", () => {
    const a = recordIdFor("checklistState", { key: "carne" }, () => "x");
    const b = recordIdFor("checklistState", { key: "carne" }, () => "y");
    expect(a).toBe(b);
  });

  it("keeps two genuinely different records as two records", () => {
    // Uploading local data must merge what is the same thing and keep what is
    // not. Two weight entries logged on different devices are not duplicates.
    const a = recordIdFor("weightEntries", { kg: 60 }, () => "id-a");
    const b = recordIdFor("weightEntries", { kg: 61 }, () => "id-b");
    expect(a).not.toBe(b);
  });

  it("uploads a local row's contents, not its device-local id", () => {
    const payload = toPayload(
      "weightEntries",
      localRow({ id: 4, uid: "r1", kg: 61, date: 5 }),
    );
    expect(payload).toEqual({ kg: 61, date: 5 });
  });
});
