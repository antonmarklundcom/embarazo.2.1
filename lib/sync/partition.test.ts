import { describe, expect, it } from "vitest";

import { MAX_PAYLOAD_BYTES, partitionRecords } from "./protocol";

// N3 — one record the server will not take must not sink the whole batch.

const good = (recordId: string) => ({
  store: "weightEntries",
  recordId,
  updatedAt: 1_760_000_000_000,
  deletedAt: null,
  payload: { kg: 61 },
});

describe("partitionRecords", () => {
  it("keeps the valid records and rejects only the invalid one", () => {
    const { valid, rejected } = partitionRecords([
      good("a"),
      { ...good("pre-v5"), updatedAt: 0 },
      good("b"),
    ]);
    expect(valid.map((r) => r.recordId)).toEqual(["a", "b"]);
    expect(rejected).toEqual([
      { store: "weightEntries", recordId: "pre-v5", outcome: "rejected", reason: "registro inválido" },
    ]);
  });

  it("rejects an oversized body on its own", () => {
    const big = { ...good("big"), payload: { note: "x".repeat(MAX_PAYLOAD_BYTES) } };
    const { valid, rejected } = partitionRecords([big, good("ok")]);
    expect(valid.map((r) => r.recordId)).toEqual(["ok"]);
    expect(rejected[0]?.recordId).toBe("big");
  });

  it("survives a record that is not even an object", () => {
    const { valid, rejected } = partitionRecords([null, 42, good("ok")]);
    expect(valid).toHaveLength(1);
    expect(rejected).toHaveLength(2);
  });
});
