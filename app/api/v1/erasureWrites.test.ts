import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { Database } from "@/lib/server/db";

const fixture = vi.hoisted(() => ({ database: undefined as Database | undefined,
  actor: "owner", rows: new Map<string, { id: string; deletedAt: Date | null }>(),
  writes: vi.fn(), signed: vi.fn(), reads: vi.fn(), transaction: undefined as unknown,
}));
vi.mock("@/lib/server/auth", () => ({ isAuthAvailable: () => true,
  getSession: async () => ({ user: { id: fixture.actor } }),
}));
vi.mock("@/lib/server/db", () => ({ dbOrNull: () => fixture.database }));
vi.mock("@/lib/rateLimit", () => ({ clientKeyFromHeaders: () => "synthetic", isRateLimited: () => false }));
vi.mock("@/lib/server/sync", () => ({ drizzleBackend: (transaction: unknown) => ({ transaction }),
  pushRecords: (...args: unknown[]) => fixture.writes(...args), pullRecords: vi.fn(),
}));
vi.mock("@/lib/server/supportBackend", () => ({ drizzleSupportBackend: () => ({}) }));
vi.mock("@/lib/server/support", () => ({ userSyncState: async () => ({ syncEpoch: 0 }) }));
vi.mock("@/lib/server/sharingBackend", () => ({ drizzleSharingBackend: () => ({
  findPregnancyOwner: async () => "owner", findInvite: async () => null,
  findLiveMembership: (...args: unknown[]) => { fixture.reads(...args); return null; },
  findPregnancyByOwner: async () => "pregnancy", upsertSnapshot: (...args: unknown[]) => fixture.writes(...args),
}) }));
vi.mock("@/lib/server/photosBackend", () => ({ drizzlePhotosBackend: () => ({
  upsert: (...args: unknown[]) => fixture.writes(...args), findRow: async () => null,
}) }));
vi.mock("@/lib/server/photoStorage", () => ({
  UPLOAD_URL_TTL_SECONDS: 900, isPhotoStorageConfigured: () => true,
  uploadUrl: (...args: unknown[]) => { fixture.signed(...args); return "https://bucket.test/synthetic"; },
  downloadUrl: vi.fn(), deleteObject: vi.fn(),
}));

import { POST as syncPost } from "./sync/route";
import { POST as sharingPost } from "./sharing/route";
import { POST as photoPost } from "./photos/route";

beforeEach(() => {
  vi.clearAllMocks(); fixture.actor = "owner"; fixture.rows.clear();
  fixture.rows.set("owner", { id: "owner", deletedAt: null });
  fixture.rows.set("companion", { id: "companion", deletedAt: null });
  fixture.transaction = { select: () => ({ from: () => ({ where: (clause: unknown) => ({
    limit: () => ({ for: async () => {
      const id = new MySqlDialect().sqlToQuery(clause as never).params[0] as string;
      const row = fixture.rows.get(id); return row ? [{ ...row }] : [];
    } }),
  }) }) }) };
  fixture.database = { transaction: async <T,>(run: (transaction: unknown) => Promise<T>) => run(fixture.transaction) } as unknown as Database;
  fixture.writes.mockResolvedValue({ results: [] });
});

function delayedRequest(path: string, body: unknown, whileReading: () => void) {
  const request = new NextRequest(`http://localhost${path}`, { method: "POST",
    headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" }, body: JSON.stringify(body),
  });
  // Context/session check happens before this method. Model erasure while
  // body bytes were delayed, then let the real route resume through its lock.
  request.json = async () => { whileReading(); return body; };
  return request;
}

describe("real mutation handlers reject pre-authorized requests after erasure", () => {
  it("sync cannot reinsert a delayed synthetic health record", async () => {
    const response = await syncPost(delayedRequest("/api/v1/sync", { records: [{
      store: "weightEntries", recordId: "synthetic-weight", updatedAt: 1, payload: { kg: 60 },
    }] }, () => fixture.rows.delete("owner")));
    expect(response?.status).toBe(401); expect(fixture.writes).not.toHaveBeenCalled();
  });

  it("sharing snapshot publication cannot survive its owner's deletion", async () => {
    const response = await sharingPost(delayedRequest("/api/v1/sharing", { action: "publish",
      week: 20, dueDate: 1, nextAppointmentAt: null, babyName: null,
    }, () => { fixture.rows.get("owner")!.deletedAt = new Date(); }));
    expect(response?.status).toBe(401); expect(fixture.writes).not.toHaveBeenCalled();
  });

  it("a live companion cannot mutate the erased owner's shared pregnancy", async () => {
    fixture.actor = "companion";
    const response = await sharingPost(delayedRequest("/api/v1/sharing", { action: "accompany",
      pregnancyId: "pregnancy", appointmentAt: 1,
    }, () => fixture.rows.delete("owner")));
    expect(response?.status).toBe(401); expect(fixture.reads).not.toHaveBeenCalled();
  });

  it.each(["upload-url", "confirm"] as const)("photo %s cannot issue a capability or index after erasure", async (action) => {
    const response = await photoPost(delayedRequest("/api/v1/photos", {
      action, store: "photoEntries", recordId: "synthetic-photo", contentType: "image/jpeg", bytes: 1,
      ...(action === "confirm" ? { updatedAt: 1, payload: { week: 20 } } : {}),
    }, () => fixture.rows.delete("owner")));
    expect(response?.status).toBe(401);
    expect(fixture.writes).not.toHaveBeenCalled(); expect(fixture.signed).not.toHaveBeenCalled();
  });
});
