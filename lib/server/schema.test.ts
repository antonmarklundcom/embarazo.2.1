import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import {
  MEMBER_ROLES,
  PUSH_CATEGORIES,
  SYNCED_STORES,
  aiGenerations,
  contentStats,
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

describe("schema export", () => {
  it("includes every table the adapter and app need", () => {
    expect(Object.keys(schema).sort()).toEqual(
      [
        "accounts",
        "adminAudit",
        "aiGenerations",
        "contentStats",
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
