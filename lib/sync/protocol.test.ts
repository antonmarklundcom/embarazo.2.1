import { describe, expect, it } from "vitest";

import {
  MAX_PAYLOAD_BYTES,
  MAX_PULL_LIMIT,
  MAX_PUSH_RECORDS,
  PULL_ALLOWED_PARAMS,
  PullQuerySchema,
  PushRequestSchema,
  SyncRecordSchema,
  decodeCursor,
  encodeCursor,
} from "./protocol";

// BUILD-PLAN A3, standing rule 4: new API surface gets a zod whitelist and
// tests. `/api/v1/sync` is the first route in this app that accepts a body, so
// the whitelist matters more here than on the read-only routes.

function record(over: Record<string, unknown> = {}) {
  return {
    store: "weightEntries",
    recordId: "w1",
    updatedAt: 1_000,
    payload: { kg: 61 },
    ...over,
  };
}

describe("push whitelist", () => {
  it("accepts a well-formed record", () => {
    expect(SyncRecordSchema.safeParse(record()).success).toBe(true);
  });

  it("rejects a store that does not sync", () => {
    // Photos never leave the device (§4.4) — the enum is what enforces it at
    // the boundary, so a client bug cannot upload one.
    expect(SyncRecordSchema.safeParse(record({ store: "photoEntries" })).success)
      .toBe(false);
    expect(SyncRecordSchema.safeParse(record({ store: "carnePhotos" })).success)
      .toBe(false);
  });

  it("rejects any field outside the envelope", () => {
    for (const extra of ["userId", "email", "role", "ip"]) {
      const parsed = SyncRecordSchema.safeParse(record({ [extra]: "x" }));
      expect(parsed.success, `${extra} must not be accepted`).toBe(false);
    }
  });

  it("rejects a non-positive or non-integer timestamp", () => {
    expect(SyncRecordSchema.safeParse(record({ updatedAt: 0 })).success).toBe(
      false,
    );
    expect(SyncRecordSchema.safeParse(record({ updatedAt: -1 })).success).toBe(
      false,
    );
    expect(SyncRecordSchema.safeParse(record({ updatedAt: 1.5 })).success).toBe(
      false,
    );
  });

  it("rejects an oversized payload", () => {
    const big = { note: "x".repeat(MAX_PAYLOAD_BYTES + 100) };
    expect(SyncRecordSchema.safeParse(record({ payload: big })).success).toBe(
      false,
    );
  });

  it("accepts a null payload — that is how a deletion travels", () => {
    const parsed = SyncRecordSchema.safeParse(
      record({ payload: null, deletedAt: 2_000 }),
    );
    expect(parsed.success).toBe(true);
  });

  it("caps how many records one request may carry", () => {
    const many = Array.from({ length: MAX_PUSH_RECORDS + 1 }, (_, i) =>
      record({ recordId: `w${i}` }),
    );
    expect(PushRequestSchema.safeParse({ records: many }).success).toBe(false);
  });

  it("rejects a body with anything other than `records`", () => {
    expect(
      PushRequestSchema.safeParse({ records: [], userId: "someone-else" })
        .success,
    ).toBe(false);
  });
});

describe("pull whitelist", () => {
  it("allows only since, limit and cursor", () => {
    expect([...PULL_ALLOWED_PARAMS].sort()).toEqual([
      "cursor",
      "limit",
      "since",
    ]);
  });

  it("rejects a limit above the cap", () => {
    expect(
      PullQuerySchema.safeParse({ since: 0, limit: MAX_PULL_LIMIT + 1 }).success,
    ).toBe(false);
  });

  it("coerces the numeric params, since they arrive as strings", () => {
    const parsed = PullQuerySchema.safeParse({ since: "1000", limit: "10" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.since).toBe(1_000);
  });

  it("rejects an unknown param", () => {
    expect(
      PullQuerySchema.safeParse({ since: 0, department: "capital" }).success,
    ).toBe(false);
  });
});

describe("pull cursor", () => {
  it("round-trips", () => {
    const cursor = { updatedAt: 1_700, store: "weightEntries", recordId: "w1" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("survives a record id containing a colon", () => {
    const cursor = {
      updatedAt: 5,
      store: "checklistState",
      recordId: "key:carne:v2",
    };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("returns null for junk rather than throwing", () => {
    for (const junk of ["", "abc", "1:", ":a:b", "x:store:id"]) {
      expect(decodeCursor(junk)).toBeNull();
    }
  });
});
