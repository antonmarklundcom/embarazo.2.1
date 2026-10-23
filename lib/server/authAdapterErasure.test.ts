import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "./db";
import { AccountWriteDenied } from "./accountWrite";

const writes = vi.hoisted(() => [] as { kind: string; transaction: unknown }[]);
vi.mock("next-auth", () => ({ default: vi.fn() }));
vi.mock("@auth/drizzle-adapter", () => ({ DrizzleAdapter: (transaction: unknown) => ({
  linkAccount: async () => { writes.push({ kind: "account", transaction }); },
  createSession: async (session: unknown) => { writes.push({ kind: "session", transaction }); return session; },
  updateUser: async (user: unknown) => { writes.push({ kind: "user", transaction }); return user; },
}) }));

import { erasureSafeAdapter } from "./auth";

function databaseFixture() {
  const state = { deletedAt: null as Date | null, exists: true };
  const transaction = { select: () => ({ from: () => ({ where: () => ({ limit: () => ({
    for: async () => state.exists ? [{ id: "owner", deletedAt: state.deletedAt }] : [],
  }) }) }) }) };
  const database = { transaction: async <T,>(run: (handle: unknown) => Promise<T>) => run(transaction) } as unknown as Database;
  return { state, transaction, adapter: erasureSafeAdapter(database) };
}
const account = { userId: "owner", provider: "google", providerAccountId: "synthetic", type: "oauth" as const };
beforeEach(() => { writes.length = 0; });

describe("OAuth adapter erasure barrier", () => {
  it("inserts an account link on the locked transaction, never the pool", async () => {
    const { adapter, transaction } = databaseFixture();
    await adapter.linkAccount!(account);
    expect(writes).toEqual([{ kind: "account", transaction }]);
  });

  it("cannot recreate OAuth links or sessions after the account disappears", async () => {
    const { adapter, state } = databaseFixture();
    state.exists = false;
    await expect(adapter.linkAccount!(account)).rejects.toBeInstanceOf(AccountWriteDenied);
    await expect(adapter.createSession!({ userId: "owner", sessionToken: "synthetic", expires: new Date() })).rejects.toBeInstanceOf(AccountWriteDenied);
    expect(writes).toEqual([]);
  });

  it("refuses adapter identity updates as soon as erasure has started", async () => {
    const { adapter, state } = databaseFixture();
    state.deletedAt = new Date();
    await expect(adapter.updateUser!({ id: "owner", email: "synthetic@example.test" })).rejects.toBeInstanceOf(AccountWriteDenied);
    expect(writes).toEqual([]);
  });
});
