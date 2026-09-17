import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import {
  VERIFICATION_TOKEN_TTL_MS,
  hashVerificationToken,
} from "@/lib/auth/emailVerification";
import { AUTH_RATE_LIMIT } from "@/lib/rateLimit";
import { users, verificationTokens } from "./schema";

// Email verification, server half.
//
// The test that matters most in this file is the cross-feature one: password
// reset and email verification share the `verificationTokens` table, and each
// clears "its" rows by `identifier` before writing a new one. If both used the
// bare email as the identifier, asking for a verification mail would delete a
// live password-reset token for the same address — a real bug for a brand-new
// user who forgets the password she chose two minutes ago, not a hypothetical
// one. Both modules are loaded here against ONE shared fake table, which is the
// only arrangement in which that interference can actually be observed.
//
// Neither module imports `next-auth` (see the note at the top of each), so
// unlike `./auth.test.ts` nothing here has to mock that package — only `./db`
// and `./email`.

// ---------------------------------------------------------------------------
// The fake database
// ---------------------------------------------------------------------------
// Stateful and actually filtering, not a scripted queue of answers — the same
// fake `./passwordReset.test.ts` documents at length. A queue would make "the
// second use of a token fails" pass even if the code never deleted anything,
// and it could not express the collision test at all. `flatten()` walks a `SQL`
// object's chunks and pulls out the (column, bound value) equality pairs that
// `eq()`/`and()` produced, which is enough for every query in both modules.

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
      // The only raw SQL these modules write is `sessionVersion + 1`.
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

// The mail transport. Captures what would have been sent, per feature, so the
// tests can assert the link's shape and which flow produced it.
const mail = vi.hoisted(() => ({
  configured: true,
  sent: [] as { kind: "verify" | "reset"; to: string; url: string }[],
  fail: false,
}));

vi.mock("./email", () => ({
  isEmailConfigured: () => mail.configured,
  sendPasswordResetEmail: async (to: string, url: string) => {
    if (mail.fail) throw new Error("transport down");
    mail.sent.push({ kind: "reset", to, url });
  },
  sendVerificationEmail: async (to: string, url: string) => {
    if (mail.fail) throw new Error("transport down");
    mail.sent.push({ kind: "verify", to, url });
  },
}));

const {
  VERIFY_IDENTIFIER_PREFIX,
  verificationStatusFor,
  requestVerificationResend,
  sendVerificationFor,
  verifyEmailToken,
  verificationIdentifier,
} = await import("./emailVerification");
const { requestPasswordReset, resetPassword } = await import("./passwordReset");

const EMAIL = "ana@example.com";
const PASSWORD = "el viejo secreto 1";
const NEW_PASSWORD = "un secreto nuevo 2";

let passwordHash: string;

/** A unique address per test, so each one owns its own rate-limit bucket. */
let ipCounter = 0;
function freshHeaders(): Headers {
  ipCounter += 1;
  return new Headers({ "x-forwarded-for": `203.0.114.${ipCounter}` });
}

function headersFor(ip: string): Headers {
  return new Headers({ "x-forwarded-for": ip });
}

beforeEach(async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://app.embarazo.com.py";
  passwordHash ??= await hashPassword(PASSWORD);
  store.configured = true;
  store.users = [
    {
      id: "u1",
      email: EMAIL,
      passwordHash,
      emailVerified: null,
      sessionVersion: 7,
    },
    {
      id: "u2",
      email: "otra@example.com",
      passwordHash,
      emailVerified: null,
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
function lastMail(kind: "verify" | "reset"): { to: string; url: string } {
  const last = [...mail.sent].reverse().find((entry) => entry.kind === kind);
  if (!last) throw new Error(`nothing was sent for ${kind}`);
  return last;
}

/** The raw token out of the emailed link — the only place it ever exists. */
function tokenFrom(kind: "verify" | "reset"): string {
  return new URL(lastMail(kind).url).searchParams.get("token") ?? "";
}

function userRow(index: number): Row {
  const row = store.users[index];
  if (!row) throw new Error(`no user row at ${index}`);
  return row;
}

function rowsFor(identifier: string): Row[] {
  return store.tokens.filter((row) => row.identifier === identifier);
}

// ---------------------------------------------------------------------------
// The one that matters: the two features do not clear each other's rows
// ---------------------------------------------------------------------------

describe("verification and password reset share a table without colliding", () => {
  it("issuing a verification token leaves a live reset token alone", async () => {
    await requestPasswordReset(EMAIL, freshHeaders());
    const resetToken = tokenFrom("reset");
    expect(rowsFor(EMAIL)).toHaveLength(1);

    // A brand-new user asks for a confirmation mail again, minutes after asking
    // for a reset. This is the sequence that would have eaten her reset link.
    await sendVerificationFor(EMAIL);
    await sendVerificationFor(EMAIL);

    // Her reset row is untouched, and the link still works.
    expect(rowsFor(EMAIL)).toHaveLength(1);
    expect(await resetPassword(resetToken, NEW_PASSWORD)).toEqual({ ok: true });
  });

  it("issuing a reset token leaves a live verification token alone", async () => {
    await sendVerificationFor(EMAIL);
    const verifyToken = tokenFrom("verify");
    expect(rowsFor(verificationIdentifier(EMAIL))).toHaveLength(1);

    await requestPasswordReset(EMAIL, freshHeaders());
    await requestPasswordReset(EMAIL, freshHeaders());

    expect(rowsFor(verificationIdentifier(EMAIL))).toHaveLength(1);
    expect(await verifyEmailToken(verifyToken)).toEqual({ ok: true });
  });

  it("keeps both rows in the table at once, under different identifiers", async () => {
    await sendVerificationFor(EMAIL);
    await requestPasswordReset(EMAIL, freshHeaders());

    expect(store.tokens).toHaveLength(2);
    // The namespaced one and the bare one. This is the whole mechanism: the two
    // delete-by-identifier statements can no longer see each other's rows.
    expect(rowsFor(EMAIL)).toHaveLength(1);
    expect(rowsFor(`${VERIFY_IDENTIFIER_PREFIX}${EMAIL}`)).toHaveLength(1);
  });

  it("cannot spend a reset token as a confirmation click", async () => {
    // Both features hash with SHA-256, so a reset token's hash IS findable by
    // the lookup in `verifyEmailToken` — the namespace check is what rejects it.
    // Without that check, clicking a reset link would consume the one credential
    // standing between a locked-out user and her account.
    await requestPasswordReset(EMAIL, freshHeaders());
    const resetToken = tokenFrom("reset");

    expect(await verifyEmailToken(resetToken)).toEqual({
      ok: false,
      error: "invalid-token",
    });
    expect(rowsFor(EMAIL)).toHaveLength(1);
    expect(userRow(0).emailVerified).toBeNull();
    // And it is still a working reset token afterwards.
    expect(await resetPassword(resetToken, NEW_PASSWORD)).toEqual({ ok: true });
  });

  it("cannot spend a verification token as a password reset", async () => {
    await sendVerificationFor(EMAIL);
    const verifyToken = tokenFrom("verify");

    // `resetPassword` finds the row by hash and then resolves the account by
    // `users.email = identifier` — and no account has the email
    // "verify:ana@example.com", so the namespace makes this a dead end.
    expect(await resetPassword(verifyToken, NEW_PASSWORD)).toEqual({
      ok: false,
      error: "invalid-token",
    });
    expect(userRow(0).passwordHash).toBe(passwordHash);
    // The verification token survives, so a failed misuse costs the user nothing.
    expect(await verifyEmailToken(verifyToken)).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// sendVerificationFor
// ---------------------------------------------------------------------------

describe("sendVerificationFor() — what lands in the table", () => {
  it("stores the hash of the token under the namespaced identifier", async () => {
    await sendVerificationFor(EMAIL);
    const raw = tokenFrom("verify");

    expect(store.tokens).toHaveLength(1);
    const stored = store.tokens[0] as Row;
    expect(stored.identifier).toBe(`verify:${EMAIL}`);
    expect(stored.token).toBe(hashVerificationToken(raw));
    // The property that matters if the table is ever dumped: the stored value
    // is not the credential and does not contain it.
    expect(stored.token).not.toBe(raw);
    expect(String(stored.token)).not.toContain(raw);
  });

  it("expires 24 hours out", async () => {
    const before = Date.now();
    await sendVerificationFor(EMAIL);
    const stored = store.tokens[0] as Row;
    const expires = (stored.expires as Date).getTime();

    expect(expires).toBeGreaterThanOrEqual(
      before + VERIFICATION_TOKEN_TTL_MS - 50,
    );
    expect(expires).toBeLessThanOrEqual(
      Date.now() + VERIFICATION_TOKEN_TTL_MS + 50,
    );
  });

  it("keeps only one live link — a second send kills the first", async () => {
    await sendVerificationFor(EMAIL);
    const first = tokenFrom("verify");
    await sendVerificationFor(EMAIL);
    const second = tokenFrom("verify");

    expect(first).not.toBe(second);
    expect(store.tokens).toHaveLength(1);
    expect(await verifyEmailToken(first)).toEqual({
      ok: false,
      error: "invalid-token",
    });
    expect(await verifyEmailToken(second)).toEqual({ ok: true });
  });

  it("mails the address it was given, at the configured origin", async () => {
    await sendVerificationFor(EMAIL);

    expect(lastMail("verify").to).toBe(EMAIL);
    const url = new URL(lastMail("verify").url);
    // Built from env, never from a request header — the same host-header
    // injection `requestPasswordReset` guards against, since a link built from
    // an attacker-set Host would deliver a live token to the attacker's server.
    expect(url.origin).toBe("https://app.embarazo.com.py");
    expect(url.pathname).toBe("/cuenta/verificar");
  });

  it("lowercases and trims the address before storing it", async () => {
    await sendVerificationFor("  ANA@Example.com ");
    const stored = store.tokens[0] as Row;
    expect(stored.identifier).toBe(`verify:${EMAIL}`);
    // ...so the identifier still resolves to the account.
    expect(await verifyEmailToken(tokenFrom("verify"))).toEqual({ ok: true });
  });
});

describe("sendVerificationFor() — never the reason a signup fails", () => {
  it("does not throw when the mail transport is down", async () => {
    mail.fail = true;
    await expect(sendVerificationFor(EMAIL)).resolves.toBeUndefined();
  });

  it("does not throw, or write, with no mail transport configured", async () => {
    mail.configured = false;
    await expect(sendVerificationFor(EMAIL)).resolves.toBeUndefined();
    expect(store.tokens).toEqual([]);
    expect(mail.sent).toEqual([]);
  });

  it("does not throw, or write, with no database", async () => {
    store.configured = false;
    await expect(sendVerificationFor(EMAIL)).resolves.toBeUndefined();
    expect(mail.sent).toEqual([]);
  });

  it("does not throw, or write, with no public URL to link to", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.AUTH_URL;
    await expect(sendVerificationFor(EMAIL)).resolves.toBeUndefined();
    expect(store.tokens).toEqual([]);
    expect(mail.sent).toEqual([]);
  });

  it("does not throw on a malformed address", async () => {
    await expect(sendVerificationFor("no-es-un-correo")).resolves.toBeUndefined();
    expect(store.tokens).toEqual([]);
  });

  it("refuses an address too long to namespace without truncation", async () => {
    // `identifier` is varchar(255) and the prefix costs 7 characters. A row
    // MySQL truncated could collide with another account's, so this is refused
    // rather than written. RFC 5321 caps a real address at 254, so no real user
    // reaches this.
    const long = `${"a".repeat(250)}@example.com`;
    const result = await requestVerificationResend(long, freshHeaders());
    expect(result).toEqual({ ok: false, error: "invalid-email" });
    expect(store.tokens).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// requestVerificationResend
// ---------------------------------------------------------------------------

describe("requestVerificationResend()", () => {
  it("reports success, and what went wrong when something did", async () => {
    expect(await requestVerificationResend(EMAIL, freshHeaders())).toEqual({
      ok: true,
    });

    mail.fail = true;
    expect(await requestVerificationResend(EMAIL, freshHeaders())).toEqual({
      ok: false,
      error: "send-failed",
    });

    mail.fail = false;
    mail.configured = false;
    expect(await requestVerificationResend(EMAIL, freshHeaders())).toEqual({
      ok: false,
      error: "not-configured",
    });
  });

  it("stops answering after AUTH_RATE_LIMIT requests from one address", async () => {
    const ip = "198.51.101.200"; // a bucket of its own
    for (let i = 0; i < AUTH_RATE_LIMIT; i++) {
      expect(
        await requestVerificationResend(EMAIL, headersFor(ip)),
        `request ${i + 1} should still be accepted`,
      ).toEqual({ ok: true });
    }

    expect(await requestVerificationResend(EMAIL, headersFor(ip))).toEqual({
      ok: false,
      error: "rate-limited",
    });
  });

  it("does not share a bucket with sign-in or with password reset", async () => {
    // R0-3's lesson, two namespaces over. Exhausting sign-in attempts must not
    // stop somebody confirming her address, and hammering *this* must not burn
    // the recovery budget of a user who is genuinely locked out.
    const ip = "198.51.101.210";
    const { isRateLimited } = await import("@/lib/rateLimit");
    for (let i = 0; i <= AUTH_RATE_LIMIT; i++) {
      isRateLimited(`auth:${ip}`, Date.now(), AUTH_RATE_LIMIT);
      isRateLimited(`reset:${ip}`, Date.now(), AUTH_RATE_LIMIT);
    }
    expect(isRateLimited(`auth:${ip}`, Date.now(), AUTH_RATE_LIMIT)).toBe(true);
    expect(isRateLimited(`reset:${ip}`, Date.now(), AUTH_RATE_LIMIT)).toBe(true);

    expect(await requestVerificationResend(EMAIL, headersFor(ip))).toEqual({
      ok: true,
    });
  });
});

// ---------------------------------------------------------------------------
// verifyEmailToken
// ---------------------------------------------------------------------------

describe("verifyEmailToken() — the happy path", () => {
  it("stamps users.emailVerified on the matching account only", async () => {
    const before = Date.now();
    await sendVerificationFor(EMAIL);

    expect(await verifyEmailToken(tokenFrom("verify"))).toEqual({ ok: true });

    const stamped = userRow(0).emailVerified;
    expect(stamped).toBeInstanceOf(Date);
    expect((stamped as Date).getTime()).toBeGreaterThanOrEqual(before - 50);
    // Nobody else's row moved.
    expect(userRow(1).emailVerified).toBeNull();
  });

  it("changes nothing else about the account", async () => {
    await sendVerificationFor(EMAIL);
    await verifyEmailToken(tokenFrom("verify"));

    // Notably NOT `sessionVersion`: confirming an address is not a reason to
    // sign anybody out of anything (a reset is; see `resetPassword`).
    expect(userRow(0)).toMatchObject({
      id: "u1",
      passwordHash,
      sessionVersion: 7,
    });
  });

  it("is readable afterwards through verificationStatusFor()", async () => {
    // Before: unconfirmed, and worth asking about — this is a credentials
    // account, so there is a real confirmation to make.
    expect(await verificationStatusFor("u1")).toEqual({
      verified: false,
      shouldConfirm: true,
    });

    await sendVerificationFor(EMAIL);
    await verifyEmailToken(tokenFrom("verify"));

    expect(await verificationStatusFor("u1")).toEqual({
      verified: true,
      shouldConfirm: false,
    });
  });

  it("says nothing at all when it cannot tell, or when there is nothing to ask", async () => {
    // An id nobody has, and a configuration with no database: silence, not an
    // accusation. `shouldConfirm: false` is what makes the /ajustes nudge render
    // nothing rather than nagging on a database hiccup.
    expect(await verificationStatusFor("nobody")).toEqual({
      verified: false,
      shouldConfirm: false,
    });

    // An OAuth-only account: `emailVerified` is null for those too (nothing in
    // the adapter or the sign-in events writes it), so asking her to confirm an
    // address Google already verified would be noise she cannot act on.
    store.users.push({
      id: "u3",
      email: "solo-google@example.com",
      passwordHash: null,
      emailVerified: null,
      sessionVersion: 1,
    });
    expect(await verificationStatusFor("u3")).toEqual({
      verified: false,
      shouldConfirm: false,
    });

    store.configured = false;
    expect(await verificationStatusFor("u1")).toEqual({
      verified: false,
      shouldConfirm: false,
    });
  });
});

describe("verifyEmailToken() — single use", () => {
  it("works once and never again", async () => {
    await sendVerificationFor(EMAIL);
    const token = tokenFrom("verify");

    expect(await verifyEmailToken(token)).toEqual({ ok: true });
    // The row is gone, not merely marked.
    expect(store.tokens).toEqual([]);

    expect(await verifyEmailToken(token)).toEqual({
      ok: false,
      error: "invalid-token",
    });
  });

  it("gives a reused token the same answer as a made-up one", async () => {
    await sendVerificationFor(EMAIL);
    const token = tokenFrom("verify");
    await verifyEmailToken(token);

    expect(await verifyEmailToken(token)).toEqual(
      await verifyEmailToken("esto-no-es-un-token-que-hayamos-emitido"),
    );
  });

  it("rejects an empty or absurdly long token before querying", async () => {
    expect(await verifyEmailToken("")).toEqual({
      ok: false,
      error: "invalid-token",
    });
    expect(await verifyEmailToken("x".repeat(5000))).toEqual({
      ok: false,
      error: "invalid-token",
    });
  });

  it("rejects everything with no database configured", async () => {
    store.configured = false;
    expect(await verifyEmailToken("cualquier-cosa")).toEqual({
      ok: false,
      error: "invalid-token",
    });
  });

  it("rejects a token whose account no longer exists", async () => {
    await sendVerificationFor(EMAIL);
    const token = tokenFrom("verify");
    // Account deleted between the mail and the click.
    store.users = store.users.filter((row) => row.email !== EMAIL);

    expect(await verifyEmailToken(token)).toEqual({
      ok: false,
      error: "invalid-token",
    });
  });
});

describe("verifyEmailToken() — expiry", () => {
  it("refuses a token past its 24 hours, and clears it", async () => {
    await sendVerificationFor(EMAIL);
    const token = tokenFrom("verify");

    // Age the row rather than the clock: the check is `expires <= now`, and
    // moving the stored date is the same assertion with no fake timers.
    (store.tokens[0] as Row).expires = new Date(Date.now() - 1);

    expect(await verifyEmailToken(token)).toEqual({
      ok: false,
      error: "expired",
    });
    // An expired row must not linger waiting for a careless future query.
    expect(store.tokens).toEqual([]);
    expect(userRow(0).emailVerified).toBeNull();
  });

  it("accepts a token with a second left on it", async () => {
    await sendVerificationFor(EMAIL);
    const token = tokenFrom("verify");
    (store.tokens[0] as Row).expires = new Date(Date.now() + 1000);

    expect(await verifyEmailToken(token)).toEqual({ ok: true });
  });
});
