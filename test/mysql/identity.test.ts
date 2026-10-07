import { beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

import { mysqlEnabled, sql } from "./setup";

// F02, N4, F18, F19 against a real MySQL/MariaDB.

type Row = Record<string, unknown>;
interface CapturedConfig {
  providers: { id?: string; options?: { authorize?: (raw: unknown, req: unknown) => Promise<Row | null> } }[];
  callbacks: {
    session: (args: { session: ReturnType<typeof session>; token: Row }) => Promise<{ user: { id: string } }>;
    jwt: (args: { token: Row; user: Row }) => Promise<Row>;
  };
}

const captured = vi.hoisted(() => ({ config: undefined as unknown }));
vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    captured.config = config;
    return { handlers: {}, auth: async () => null, signIn: async () => {}, signOut: async () => {} };
  },
}));
vi.mock("@auth/drizzle-adapter", () => ({ DrizzleAdapter: () => ({}) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, delete: () => {} }) }));

function session() {
  return { user: { id: "" }, expires: "2099-01-01T00:00:00.000Z" };
}
const request = () => ({ headers: new Headers({ "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 250)}` }) });

describe.skipIf(!mysqlEnabled)("identity on a real database", () => {
  let auth: typeof import("@/lib/server/auth");
  let account: typeof import("@/lib/server/account");
  let db: typeof import("@/lib/server/db");
  let reset: typeof import("@/lib/server/passwordReset");
  let password: typeof import("@/lib/auth/password");
  let tokens: typeof import("@/lib/auth/passwordReset");
  let verification: typeof import("@/lib/auth/emailVerification");
  let config: CapturedConfig;

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-only-secret-for-the-mysql-suite";
    auth = await import("@/lib/server/auth");
    account = await import("@/lib/server/account");
    db = await import("@/lib/server/db");
    reset = await import("@/lib/server/passwordReset");
    password = await import("@/lib/auth/password");
    tokens = await import("@/lib/auth/passwordReset");
    verification = await import("@/lib/auth/emailVerification");
    await auth.getSession();
    config = captured.config as CapturedConfig;
  });

  async function first(query: string, params: unknown[]): Promise<Row> {
    const c = await sql();
    const [rows] = await c.query(query, params);
    await c.end();
    return (rows as Row[])[0]!;
  }

  async function user(email: string, hash: string | null = null): Promise<string> {
    const c = await sql();
    const id = randomUUID();
    await c.query("INSERT INTO users (id, email, passwordHash) VALUES (?, ?, ?)", [id, email, hash]);
    await c.end();
    return id;
  }

  it("F02: after erasure the old token resolves to nobody", async () => {
    const id = await user("f02@example.test");
    const token = { sub: id, sessionVersion: 0 };
    expect((await config.callbacks.session({ session: session(), token })).user.id).toBe(id);

    await account.deleteAccountData(account.drizzleAccountExecutor(db.db()), id);

    expect((await config.callbacks.session({ session: session(), token })).user.id).toBe("");
  });

  it("F02: an account marked for deletion is signed out before any row goes", async () => {
    const id = await user("f02b@example.test");
    const executor = account.drizzleAccountExecutor(db.db());
    await executor.markDeleting(id);
    const row = await first("SELECT deletedAt, sessionVersion FROM users WHERE id = ?", [id]);
    expect(row.deletedAt).not.toBeNull();
    expect(row.sessionVersion).toBe(1);
    expect((await config.callbacks.session({ session: session(), token: { sub: id, sessionVersion: 1 } })).user.id).toBe("");
  });

  it("F02: an interrupted erasure is finished, and the address is free again", async () => {
    const id = await user("f02c@example.test");
    await account.drizzleAccountExecutor(db.db()).markDeleting(id);
    expect(await account.finishPendingDeletions(db.db(), { email: "f02c@example.test" })).toBe(1);
    expect(await auth.registerCredentialsUser("f02c@example.test", "a fresh password 1")).toEqual({ ok: true });
  });

  it("N4: a sign-in whose bcrypt straddles an OAuth revocation gets a revoked session", async () => {
    const authorize = config.providers.find((p) => p.id === "credentials")!.options!.authorize!;
    const id = await user("n4@example.test", await password.hashPassword("attacker pass 1"));
    const signingIn = authorize({ email: "n4@example.test", password: "attacker pass 1" }, request());
    await new Promise((r) => setTimeout(r, 40));
    await auth.revokeUnverifiedPassword("n4@example.test");
    const signedIn = await signingIn;
    if (signedIn) {
      const token = await config.callbacks.jwt({ token: {}, user: signedIn });
      expect((await config.callbacks.session({ session: session(), token })).user.id).toBe("");
    } else {
      expect(signedIn).toBeNull(); // the revocation landed before the read: also fine
    }
    const row = await first("SELECT passwordHash FROM users WHERE id = ?", [id]);
    expect(row.passwordHash).toBeNull();
  });

  it("F18: two overlapping uses of one reset link — exactly one wins", async () => {
    const id = await user("f18@example.test", await password.hashPassword("old password 1"));
    const c = await sql();
    await c.query("INSERT INTO verificationTokens (identifier, token, expires) VALUES (?, ?, ?)", [
      "f18@example.test",
      tokens.hashResetToken("tok-f18"),
      new Date(Date.now() + 30 * 60_000),
    ]);
    const results = await Promise.all([
      reset.resetPassword("tok-f18", "new password A1"),
      reset.resetPassword("tok-f18", "new password B2"),
    ]);
    await c.end();
    const row = await first("SELECT passwordHash, sessionVersion FROM users WHERE id = ?", [id]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(row.sessionVersion).toBe(1);
    const winner = results[0]!.ok ? "new password A1" : "new password B2";
    expect(await password.verifyPassword(winner, row.passwordHash as string)).toBe(true);
  });

  it("F19: erasure removes the confirmation token too", async () => {
    const id = await user("f19@example.test");
    const c = await sql();
    await c.query("INSERT INTO verificationTokens (identifier, token, expires) VALUES (?, ?, ?)", [
      "verify:f19@example.test",
      verification.hashVerificationToken("tok-f19"),
      new Date(Date.now() + 86_400_000),
    ]);
    await account.deleteAccountData(account.drizzleAccountExecutor(db.db()), id);
    await c.end();
    const count = await first("SELECT COUNT(*) AS n FROM verificationTokens", []);
    expect(Number(count.n)).toBe(0);
  });

  it("F02: a late write during erasure does not survive it", async () => {
    const id = await user("late@example.test");
    const executor = account.drizzleAccountExecutor(db.db());
    const original = executor.deleteUser;
    executor.deleteUser = async (userId) => {
      const c = await sql();
      await c.query(
        "INSERT INTO syncRecords (userId, store, recordId, updatedAt, serverUpdatedAt, payload) VALUES (?, 'weightEntries', 'late', 1, 1, '{}')",
        [userId],
      );
      await c.end();
      return original(userId);
    };
    await account.deleteAccountData(executor, id);
    const count = await first("SELECT COUNT(*) AS n FROM syncRecords WHERE userId = ?", [id]);
    expect(Number(count.n)).toBe(0);
  });
});
