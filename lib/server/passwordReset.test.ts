import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashResetToken, RESET_TOKEN_TTL_MS } from "@/lib/auth/passwordReset";
import { AUTH_RATE_LIMIT } from "@/lib/rateLimit";
import { users, verificationTokens } from "./schema";

// Password reset, server half. This is the flow that can hand an attacker
// somebody else's account, so the tests below are about the security properties
// rather than the happy path: no email enumeration, no token reuse, no expired
// token accepted, no session left alive afterwards.
//
// `./passwordReset` deliberately does not import `next-auth` (see the note at
// the top of the module), so unlike `./auth.test.ts` nothing here has to mock
// that package - only `./db` and `./email`.

// ---------------------------------------------------------------------------
// The fake database
// ---------------------------------------------------------------------------
// Stateful and actually filtering, not a scripted queue of answers. A queue
// would make "the second use of a token fails" pass even if the code never
// deleted anything, which is the one thing that test exists to prove. So the
// fake keeps rows in memory and evaluates the real Drizzle `where` clause
// against them: `flatten()` walks a `SQL` object's chunks and pulls out the
// (column, bound value) equality pairs that `eq()`/`and()` produced. That is
// enough for every query in the module under test, all of which are equality
// filters, and it means a query matching the wrong row fails the test.

interface Chunkish {
  queryChunks?: unknown[];
  name?: string;
  value?: unknown;
}

type Row = Record<string, unknown>;

/** The `column = value` pairs in a where clause, as `{ columnName: value }`. */
function flatten(where: unknown): Record<string, unknown> {
  const pairs: Record<string, unknown> = {};
  let pendingColumn: string | undefined;

  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const chunk = node as Chunkish;
    if (Array.isArray(chunk.queryChunks)) {
      for (const child of chunk.queryChunks) walk(child);
      return;
    }
    const kind = node.constructor?.name ?? "";
    if (kind.startsWith("MySql") && typeof chunk.name === "string") {
      pendingColumn = chunk.name;
      return;
    }
    if (kind === "Param" && pendingColumn) {
      pairs[pendingColumn] = chunk.value;
      pendingColumn = undefined;
    }
  };

  walk(where);
  return pairs;
}

function matches(row: Row, where: unknown): boolean {
  const pairs = flatten(where);
  return Object.entries(pairs).every(([column, value]) => {
    const actual = row[column];
    if (actual instanceof Date && value instanceof Date) {
      return actual.getTime() === value.getTime();
    }
    return actual === value;
  });
}

const store = vi.hoisted(() => ({
  configured: true,
  users: [] as Record<string, unknown>[],
  tokens: [] as Record<string, unknown>[],
}));

function tableRows(table: unknown): Row[] {
  if (table === users) return store.users;
  if (table === verificationTokens) return store.tokens;
  throw new Error("The fake database was handed a table it does not know.");
}

/** Applies a `.set()` payload, resolving a `sql` increment to arithmetic. */
function applySet(row: Row, values: Row): void {
  for (const [key, value] of Object.entries(values)) {
    const asSql = value as Chunkish;
    if (value && typeof value === "object" && Array.isArray(asSql.queryChunks)) {
      // The only raw SQL this module writes is `sessionVersion + 1`.
      row[key] = Number(row[key] ?? 0) + 1;
      continue;
    }
    row[key] = value;
  }
}

const fakeDb = {
  select: (fields: Record<string, { name: string }>) => ({
    from: (table: unknown) => ({
      where: (clause: unknown) => ({
        limit: (n: number) =>
          Promise.resolve(
            tableRows(table)
              .filter((row) => matches(row, clause))
              .slice(0, n)
              .map((row) =>
                Object.fromEntries(
                  Object.entries(fields).map(([alias, column]) => [
                    alias,
                    row[column.name],
                  ]),
                ),
              ),
          ),
      }),
    }),
  }),
  insert: (table: unknown) => ({
    values: (row: Row) => {
      tableRows(table).push({ ...row });
      return Promise.resolve(undefined);
    },
  }),
  delete: (table: unknown) => ({
    where: (clause: unknown) => {
      const rows = tableRows(table);
      const kept = rows.filter((row) => !matches(row, clause));
      rows.length = 0;
      rows.push(...kept);
      return Promise.resolve(undefined);
    },
  }),
  update: (table: unknown) => ({
    set: (values: Row) => ({
      where: (clause: unknown) => {
        for (const row of tableRows(table)) {
          if (matches(row, clause)) applySet(row, values);
        }
        return Promise.resolve(undefined);
      },
    }),
  }),
};

vi.mock("./db", () => ({
  isDatabaseConfigured: () => store.configured,
  db: () => fakeDb,
}));

// The mail transport. Captures what would have been sent so the tests can
// assert the link's shape - and, more importantly, assert that nothing is sent
// for an address with no account.
const mail = vi.hoisted(() => ({
  configured: true,
  sent: [] as { to: string; url: string }[],
  fail: false,
}));

vi.mock("./email", () => ({
  isEmailConfigured: () => mail.configured,
  sendPasswordResetEmail: async (to: string, url: string) => {
    if (mail.fail) throw new Error("transport down");
    mail.sent.push({ to, url });
  },
}));

const { requestPasswordReset, resetPassword } = await import("./passwordReset");

const OLD_PASSWORD = "el viejo secreto 1";
const NEW_PASSWORD = "un secreto nuevo 2";
const EMAIL = "ana@example.com";

let oldHash: string;

/** A unique address per test, so each one owns its own rate-limit bucket. */
let ipCounter = 0;
function freshHeaders(): Headers {
  ipCounter += 1;
  return new Headers({ "x-forwarded-for": `203.0.113.${ipCounter}` });
}

function headersFor(ip: string): Headers {
  return new Headers({ "x-forwarded-for": ip });
}

beforeEach(async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://app.embarazo.com.py";
  oldHash ??= await hashPassword(OLD_PASSWORD);
  store.configured = true;
  store.users = [
    { id: "u1", email: EMAIL, passwordHash: oldHash, sessionVersion: 7 },
    {
      id: "u2",
      email: "solo-google@example.com",
      passwordHash: null,
      sessionVersion: 1,
    },
  ];
  store.tokens = [];
  mail.configured = true;
  mail.fail = false;
  mail.sent = [];
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
});

// Accessors rather than bare indexing: `noUncheckedIndexedAccess` is on, and a
// throw names the broken assumption better than a `!` hides it.
function lastMail(): { to: string; url: string } {
  const last = mail.sent.at(-1);
  if (!last) throw new Error("nothing was sent");
  return last;
}

function tokenRow(): Row {
  const row = store.tokens[0];
  if (!row) throw new Error("no token row was written");
  return row;
}

function userRow(index: number): Row {
  const row = store.users[index];
  if (!row) throw new Error(`no user row at ${index}`);
  return row;
}

/** The raw token out of the emailed link - the only place it ever exists. */
function tokenFromLastMail(): string {
  return new URL(lastMail().url).searchParams.get("token") ?? "";
}

describe("requestPasswordReset() - email enumeration", () => {
  it("answers a registered address and an unknown one identically", async () => {
    const registered = await requestPasswordReset(EMAIL, freshHeaders());
    const unknown = await requestPasswordReset(
      "nadie@example.com",
      freshHeaders(),
    );

    // Same result object, byte for byte. No "we sent it" vs "no such account".
    expect(registered).toEqual({ ok: true });
    expect(unknown).toEqual(registered);
  });

  it("answers an OAuth-only account exactly the same, and mails it nothing", async () => {
    const result = await requestPasswordReset(
      "solo-google@example.com",
      freshHeaders(),
    );

    expect(result).toEqual({ ok: true });
    // No password to reset, so no link - and no row either.
    expect(mail.sent).toEqual([]);
    expect(store.tokens).toEqual([]);
  });

  it("writes no row for an unknown address", async () => {
    await requestPasswordReset("nadie@example.com", freshHeaders());
    expect(store.tokens).toEqual([]);
    expect(mail.sent).toEqual([]);
  });

  it("mails the registered address and nobody else", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    expect(mail.sent).toHaveLength(1);
    expect(lastMail().to).toBe(EMAIL);
  });
});

describe("requestPasswordReset() - what lands in the table", () => {
  it("stores the hash of the token, never the token itself", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    const raw = tokenFromLastMail();

    expect(store.tokens).toHaveLength(1);
    const stored = tokenRow();
    expect(stored.identifier).toBe(EMAIL);
    expect(stored.token).toBe(hashResetToken(raw));
    // The property that matters if the table is ever dumped: the stored value
    // is not the credential and does not contain it.
    expect(stored.token).not.toBe(raw);
    expect(String(stored.token)).not.toContain(raw);
  });

  it("expires 30 minutes out", async () => {
    const before = Date.now();
    await requestPasswordReset(EMAIL, freshHeaders());
    const expires = (tokenRow().expires as Date).getTime();

    expect(expires).toBeGreaterThanOrEqual(before + RESET_TOKEN_TTL_MS - 50);
    expect(expires).toBeLessThanOrEqual(Date.now() + RESET_TOKEN_TTL_MS + 50);
  });

  it("keeps only one live token - a second request kills the first", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    const first = tokenFromLastMail();
    await requestPasswordReset(EMAIL, freshHeaders());
    const second = tokenFromLastMail();

    expect(first).not.toBe(second);
    expect(store.tokens).toHaveLength(1);

    // The older link is dead even though its 30 minutes have not passed.
    expect(await resetPassword(first, NEW_PASSWORD)).toEqual({
      ok: false,
      error: "invalid-token",
    });
    expect(await resetPassword(second, NEW_PASSWORD)).toEqual({ ok: true });
  });

  it("builds the link from env, not from anything a caller can send", async () => {
    // A request carrying an attacker-controlled Host / X-Forwarded-Host: the
    // link must still point at the configured origin. This is the host-header
    // injection that turns a reset mail into a token exfiltration channel.
    const hostile = new Headers({
      "x-forwarded-for": "198.51.100.7",
      host: "evil.example",
      "x-forwarded-host": "evil.example",
    });

    await requestPasswordReset(EMAIL, hostile);

    const url = new URL(lastMail().url);
    expect(url.origin).toBe("https://app.embarazo.com.py");
    expect(url.pathname).toBe("/cuenta/restablecer");
    expect(lastMail().url).not.toContain("evil.example");
  });
});

describe("requestPasswordReset() - degrading instead of crashing", () => {
  it("reports not-configured with no mail transport, and writes nothing", async () => {
    mail.configured = false;
    expect(await requestPasswordReset(EMAIL, freshHeaders())).toEqual({
      ok: false,
      error: "not-configured",
    });
    expect(store.tokens).toEqual([]);
  });

  it("reports not-configured with no database", async () => {
    store.configured = false;
    expect(await requestPasswordReset(EMAIL, freshHeaders())).toEqual({
      ok: false,
      error: "not-configured",
    });
  });

  it("reports not-configured when there is no public URL to link to", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.AUTH_URL;
    expect(await requestPasswordReset(EMAIL, freshHeaders())).toEqual({
      ok: false,
      error: "not-configured",
    });
    expect(store.tokens).toEqual([]);
  });

  it("surfaces a failed send rather than claiming success", async () => {
    mail.fail = true;
    expect(await requestPasswordReset(EMAIL, freshHeaders())).toEqual({
      ok: false,
      error: "send-failed",
    });
  });

  it("rejects a malformed address before touching anything", async () => {
    expect(await requestPasswordReset("no-es-un-correo", freshHeaders())).toEqual(
      { ok: false, error: "invalid-email" },
    );
    expect(store.tokens).toEqual([]);
  });
});

describe("requestPasswordReset() - the rate limit", () => {
  it("stops answering after AUTH_RATE_LIMIT requests from one address", async () => {
    const ip = "198.51.100.200"; // a bucket of its own
    for (let i = 0; i < AUTH_RATE_LIMIT; i++) {
      const result = await requestPasswordReset(EMAIL, headersFor(ip));
      expect(result, `request ${i + 1} should still be accepted`).toEqual({
        ok: true,
      });
    }

    expect(await requestPasswordReset(EMAIL, headersFor(ip))).toEqual({
      ok: false,
      error: "rate-limited",
    });
  });

  it("keys the limit per address - a neighbour is unaffected", async () => {
    const ip = "198.51.100.201";
    for (let i = 0; i <= AUTH_RATE_LIMIT; i++) {
      await requestPasswordReset(EMAIL, headersFor(ip));
    }
    expect(
      await requestPasswordReset(EMAIL, headersFor("198.51.100.202")),
    ).toEqual({ ok: true });
  });

  it("does not share a bucket with sign-in", async () => {
    // R0-3's lesson, one namespace over: `reset:` and `auth:` are separate
    // budgets, so exhausting sign-in attempts must not lock somebody out of the
    // only way back into their account. Asserted through the limiter itself
    // rather than by reading the source (the invariant test in
    // lib/invariants/rateLimits.test.ts does that part).
    const ip = "198.51.100.210";
    const { isRateLimited } = await import("@/lib/rateLimit");
    for (let i = 0; i <= AUTH_RATE_LIMIT; i++) {
      isRateLimited(`auth:${ip}`, Date.now(), AUTH_RATE_LIMIT);
    }
    expect(isRateLimited(`auth:${ip}`, Date.now(), AUTH_RATE_LIMIT)).toBe(true);

    // The reset budget for the very same address is untouched.
    expect(await requestPasswordReset(EMAIL, headersFor(ip))).toEqual({
      ok: true,
    });
  });
});

describe("resetPassword() - single use", () => {
  it("works once and never again", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    const token = tokenFromLastMail();

    expect(await resetPassword(token, NEW_PASSWORD)).toEqual({ ok: true });
    // The row is gone, not merely marked.
    expect(store.tokens).toEqual([]);

    expect(await resetPassword(token, "otra contrasena 3")).toEqual({
      ok: false,
      error: "invalid-token",
    });
  });

  it("gives a reused token the same answer as a made-up one", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    const token = tokenFromLastMail();
    await resetPassword(token, NEW_PASSWORD);

    const reused = await resetPassword(token, "otra contrasena 3");
    const invented = await resetPassword(
      "esto-no-es-un-token-que-hayamos-emitido",
      "otra contrasena 3",
    );
    expect(reused).toEqual(invented);
  });

  it("rejects a token that was never issued, without a write", async () => {
    expect(await resetPassword("nunca-emitido", NEW_PASSWORD)).toEqual({
      ok: false,
      error: "invalid-token",
    });
    expect(userRow(0).passwordHash).toBe(oldHash);
  });

  it("rejects an empty or absurdly long token before querying", async () => {
    expect(await resetPassword("", NEW_PASSWORD)).toEqual({
      ok: false,
      error: "invalid-token",
    });
    expect(await resetPassword("x".repeat(5000), NEW_PASSWORD)).toEqual({
      ok: false,
      error: "invalid-token",
    });
  });
});

describe("resetPassword() - expiry", () => {
  it("refuses a token past its 30 minutes, and clears it", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    const token = tokenFromLastMail();

    // Age the row rather than the clock: the check is `expires <= now`, and
    // moving the stored date is the same assertion with no fake timers.
    tokenRow().expires = new Date(Date.now() - 1);

    expect(await resetPassword(token, NEW_PASSWORD)).toEqual({
      ok: false,
      error: "expired",
    });
    // An expired row must not linger waiting for a careless future query.
    expect(store.tokens).toEqual([]);
    expect(userRow(0).passwordHash).toBe(oldHash);
  });

  it("accepts a token with a second left on it", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    const token = tokenFromLastMail();
    tokenRow().expires = new Date(Date.now() + 1000);

    expect(await resetPassword(token, NEW_PASSWORD)).toEqual({ ok: true });
  });
});

describe("resetPassword() - the password that comes out the other side", () => {
  it("is what authorize() will accept, and the old one no longer is", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    const token = tokenFromLastMail();
    await resetPassword(token, NEW_PASSWORD);

    const stored = String(userRow(0).passwordHash);
    // `verifyPassword(password, row.passwordHash)` is verbatim the check
    // `authorize()` in ./auth.ts makes, so this is that decision, reproduced.
    expect(await verifyPassword(NEW_PASSWORD, stored)).toBe(true);
    expect(await verifyPassword(OLD_PASSWORD, stored)).toBe(false);
  });

  it("is stored as a bcrypt hash, not as the password", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    await resetPassword(tokenFromLastMail(), NEW_PASSWORD);

    const stored = String(userRow(0).passwordHash);
    expect(stored).toMatch(/^\$2[aby]\$12\$/);
    expect(stored).not.toContain(NEW_PASSWORD);
  });

  it("refuses a password under 8 characters without spending the token", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    const token = tokenFromLastMail();

    expect(await resetPassword(token, "corta")).toEqual({
      ok: false,
      error: "weak-password",
    });
    // A mistyped password must not cost the user the link.
    expect(store.tokens).toHaveLength(1);
    expect(await resetPassword(token, NEW_PASSWORD)).toEqual({ ok: true });
  });

  it("touches only the account the token belongs to", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    await resetPassword(tokenFromLastMail(), NEW_PASSWORD);

    expect(userRow(1)).toMatchObject({
      id: "u2",
      passwordHash: null,
      sessionVersion: 1,
    });
  });
});

describe("resetPassword() - every open session ends", () => {
  it("bumps sessionVersion, which is how I1/U6 revokes a JWT", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    await resetPassword(tokenFromLastMail(), NEW_PASSWORD);

    // 7 -> 8: every token stamped with 7 stops resolving to a user on its next
    // request (the `session` callback in ./auth.ts). Someone resetting a
    // password is plausibly doing it because a device is no longer theirs.
    expect(userRow(0).sessionVersion).toBe(8);
  });

  it("does nothing with no database configured", async () => {
    store.configured = false;
    expect(await resetPassword("anything", NEW_PASSWORD)).toEqual({
      ok: false,
      error: "not-configured",
    });
  });
});
