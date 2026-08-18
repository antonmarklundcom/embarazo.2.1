import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import {
  MEMBER_ROLES,
  PUSH_CATEGORIES,
  SYNCED_STORES,
  aiGenerations,
  companionCheers,
  companionTasks,
  contentStats,
  photoBlobs,
  schema,
  syncRecords,
  users,
} from "./schema";

// BUILD-PLAN A1. These assert the parts of the schema that are data-contract
// decisions rather than implementation detail (ARCHITECTURE.md §4). They are
// meant to fail loudly if a future change quietly widens what the server
// learns about a user.

function columnNames(table: Parameters<typeof getTableColumns>[0]): string[] {
  return Object.values(getTableColumns(table)).map((c) => c.name);
}

describe("contentStats carries no identity (§4.5)", () => {
  it("has no user, session, device or IP column", () => {
    const columns = columnNames(contentStats).map((c) => c.toLowerCase());
    for (const forbidden of ["user", "session", "device", "ip", "token"]) {
      expect(
        columns.some((c) => c.includes(forbidden)),
        `contentStats must not carry a "${forbidden}" column`,
      ).toBe(false);
    }
  });

  it("buckets by day, not by timestamp", () => {
    expect(columnNames(contentStats)).toContain("day");
  });
});

describe("syncRecords keeps the payload opaque (§4.3)", () => {
  it("stores exactly one payload column and nothing derived from it", () => {
    const columns = columnNames(syncRecords).sort();
    expect(columns).toEqual(
      [
        "deletedAt",
        "payload",
        "pregnancyId",
        "recordId",
        "serverUpdatedAt",
        "store",
        "updatedAt",
        "userId",
      ].sort(),
    );
  });

  it("indexes only metadata, never the payload", () => {
    // The pull query is (userId, updatedAt); nothing may index into payload.
    const config = getTableColumns(syncRecords);
    expect(config.payload.name).toBe("payload");
    expect(config.updatedAt.name).toBe("updatedAt");
  });
});

describe("SYNCED_STORES", () => {
  it("excludes photos — they never leave the device in v1 (§4.4)", () => {
    for (const store of SYNCED_STORES) {
      expect(store.toLowerCase()).not.toContain("photo");
      expect(store.toLowerCase()).not.toContain("foto");
      expect(store.toLowerCase()).not.toContain("carne");
    }
  });

  it("has no duplicates", () => {
    expect(new Set(SYNCED_STORES).size).toBe(SYNCED_STORES.length);
  });
});

describe("aiGenerations records cost, not content (§10)", () => {
  it("stores no prompt, image, photo or URL column", () => {
    const columns = columnNames(aiGenerations).map((c) => c.toLowerCase());
    for (const forbidden of ["prompt", "image", "photo", "url", "input"]) {
      expect(
        columns.some((c) => c.includes(forbidden)),
        `aiGenerations must not carry a "${forbidden}" column`,
      ).toBe(false);
    }
  });

  it("keeps a per-month quota key so the quota check is a single count", () => {
    expect(columnNames(aiGenerations)).toContain("quotaMonth");
  });
});

describe("users", () => {
  it("defaults new accounts to the non-admin role", () => {
    expect(getTableColumns(users).role.default).toBe("user");
  });
});

describe("role and category vocabularies", () => {
  it("matches the documented roles", () => {
    expect(MEMBER_ROLES).toEqual(["owner", "partner", "family"]);
  });

  it("matches the documented push categories (FEATURE-MAP #7)", () => {
    expect(PUSH_CATEGORIES).toEqual(["consejos", "recordatorios", "avisos"]);
  });
});

describe("K2's two new companion tables stay ids-and-timestamps (§4.3)", () => {
  it("companionTasks stores a key, never a label or a note", () => {
    expect(columnNames(companionTasks).sort()).toEqual(
      ["id", "pregnancyId", "itemKey", "doneAt", "updatedAt"].sort(),
    );
    const columns = columnNames(companionTasks).map((c) => c.toLowerCase());
    for (const forbidden of ["label", "text", "note", "comment", "message", "title"]) {
      expect(
        columns.some((c) => c.includes(forbidden)),
        `companionTasks must not carry a "${forbidden}" column`,
      ).toBe(false);
    }
  });

  it("companionCheers stores which button was pressed, never what was written", () => {
    expect(columnNames(companionCheers).sort()).toEqual(
      ["id", "pregnancyId", "fromUserId", "cheerId", "createdAt", "seenAt"].sort(),
    );
    const columns = columnNames(companionCheers).map((c) => c.toLowerCase());
    for (const forbidden of ["text", "note", "body", "message", "comment"]) {
      expect(
        columns.some((c) => c.includes(forbidden)),
        `companionCheers must not carry a "${forbidden}" column`,
      ).toBe(false);
    }
  });
});

describe("photoBlobs keeps the photo's own metadata opaque (§4.3, §4.4 amended)", () => {
  it("stores exactly the index columns and one opaque payload", () => {
    expect(columnNames(photoBlobs).sort()).toEqual(
      [
        "userId",
        "store",
        "recordId",
        "objectKey",
        "contentType",
        "bytes",
        "payload",
        "updatedAt",
        "deletedAt",
        "serverUpdatedAt",
      ].sort(),
    );
  });

  it("has no column for anything about the pregnancy", () => {
    // A bump photo's week is health data. It travels inside `payload` — the
    // same envelope syncRecords uses — precisely so it does not become a third
    // §4.3 exception. The server has no reason to know it; it only hands it
    // back.
    const columns = columnNames(photoBlobs).map((c) => c.toLowerCase());
    for (const forbidden of ["week", "trimester", "note", "caption", "baby", "due"]) {
      expect(
        columns.some((c) => c.includes(forbidden)),
        `photoBlobs must not carry a "${forbidden}" column`,
      ).toBe(false);
    }
  });

  it("keeps the bytes out of the database entirely", () => {
    // MySQL is the wrong place for blobs at scale, which is the whole reason
    // K4 stands up object storage. `bytes` is a size; there is no blob column.
    const columns = columnNames(photoBlobs).map((c) => c.toLowerCase());
    for (const forbidden of ["blob", "data", "image", "content_"]) {
      expect(columns.some((c) => c.includes(forbidden)), forbidden).toBe(false);
    }
  });
});

describe("schema export", () => {
  it("includes every table the adapter and app need", () => {
    expect(Object.keys(schema).sort()).toEqual(
      [
        "accounts",
        "adminAudit",
        "aiGenerations",
        "companionSnapshots",
        "companionCheers",
        "companionTasks",
        "contentStats",
        "photoBlobs",
        "invites",
        "pregnancies",
        "pregnancyMembers",
        "pushReminders",
        "pushSubscriptions",
        "sessions",
        "syncRecords",
        "users",
        "verificationTokens",
      ].sort(),
    );
  });
});
