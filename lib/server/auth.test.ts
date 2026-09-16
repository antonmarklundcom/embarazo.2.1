import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import { AUTH_RATE_LIMIT } from "@/lib/rateLimit";

// R0-3 — PR-20's email + password flow had zero test coverage. This covers
// the two functions that actually decide whether a password gets someone in:
// `authorize()` (the Credentials provider's callback) and
// `registerCredentialsUser()`, both in `./auth` (this file's sibling).
//
// `lib/server/auth.ts` imports `NextAuth` from "next-auth" at module scope,
// and evaluating the real package under vitest's node environment fails: it
// pulls in `next-auth/lib/env.js`, which imports `next/server` in a way this
// resolver can't handle. `app/api/v1/ai/baby/route.test.ts` hits the same
// wall and works around it by mocking `@/lib/server/auth` wholesale — that
// option is not available here, because this file's whole point is to
// exercise the real `authorize()`/`registerCredentialsUser`. So only
// `next-auth`'s default export is mocked, down to "capture the config
// `buildConfig()` built and hand back inert stand-ins for the rest" — nothing
// about the two functions under test is faked.
// `Credentials()` (from `@auth/core/providers/credentials`, real and
// unmocked here) does not expose the `authorize` we pass it directly — it
// returns a fixed `{ id: "credentials", authorize: () => null, options: config, ... }`
// and only @auth/core's own internal provider normalization (which never
// runs, because `NextAuth()` itself is mocked below) reads the real one back
// out of `options`. So the real `authorize` is recovered from
// `provider.options.authorize`, not `provider.authorize`.
const hoisted = vi.hoisted(() => ({
  capturedConfig: undefined as
    | {
        providers: Array<{
          id?: string;
          options?: { authorize?: (...args: never[]) => unknown };
        }>;
      }
    | undefined,
}));

vi.mock("next-auth", () => ({
  default: (config: typeof hoisted.capturedConfig) => {
    hoisted.capturedConfig = config;
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: vi.fn(async () => null),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  },
}));

// `buildConfig()` also wires up `DrizzleAdapter(db(), ...)`, which nothing
// under test here ever calls a method on — it just has to exist without
// throwing. The real adapter brand-checks its `db` argument against Drizzle's
// MySQL/Postgres/SQLite classes with `instanceof`-like machinery that the
// fake `db()` above was never going to satisfy, so it is mocked out too.
vi.mock("@auth/drizzle-adapter", () => ({
  DrizzleAdapter: () => ({}),
}));

// The database itself, mocked the same way `./db` documents call sites must
// branch: `isDatabaseConfigured()` is a fake switch, `db()` returns a fluent
// stand-in shaped like the one Drizzle chain `authorize()` and
// `registerCredentialsUser()` each call — `select().from().where().limit()`
// and `insert().values()`.
const dbState = vi.hoisted(() => ({
  isDatabaseConfigured: vi.fn(() => true),
  // FIFO queue: each `select()...limit()` call resolves the next entry.
  selectResults: [] as unknown[][],
  insertedRows: [] as unknown[],
}));

vi.mock("./db", () => ({
  isDatabaseConfigured: dbState.isDatabaseConfigured,
  db: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(dbState.selectResults.shift() ?? []),
        }),
      }),
    }),
    insert: () => ({
      values: (row: unknown) => {
        dbState.insertedRows.push(row);
        return Promise.resolve(undefined);
      },
    }),
  }),
}));

// `env` needs only AUTH_SECRET (lib/auth/config.ts's `isAuthConfigured`) —
// PR-20 deliberately made email+password need no OAuth provider configured.
process.env.AUTH_SECRET = "test-secret";

let authorize: (
  credentials: Partial<Record<"email" | "password", unknown>>,
  request: Request,
) => Promise<unknown>;
let registerCredentialsUser: (
  email: string,
  password: string,
) => Promise<{ ok: true } | { ok: false; error: "email-taken" | "not-configured" }>;

const REAL_PASSWORD = "correct horse battery staple";
let realHash: string;

beforeAll(async () => {
  realHash = await hashPassword(REAL_PASSWORD);

  const auth = await import("./auth");
  registerCredentialsUser = auth.registerCredentialsUser;

  // `authorize()` lives inside `buildConfig()`'s Credentials provider, which
  // is only built when `instance()` runs. `getSession()` is the cheapest
  // exported function that triggers it (`isDatabaseConfigured()` is faked
  // true above, and `AUTH_SECRET` is set, so `isAuthAvailable()` passes).
  await auth.getSession();
  const credentialsProvider = hoisted.capturedConfig?.providers.find(
    (p) => p.id === "credentials",
  );
  if (typeof credentialsProvider?.options?.authorize !== "function") {
    throw new Error("Credentials provider was not captured — test setup is broken.");
  }
  authorize = credentialsProvider.options.authorize as typeof authorize;
});

afterEach(() => {
  dbState.selectResults.length = 0;
  dbState.insertedRows.length = 0;
  dbState.isDatabaseConfigured.mockReturnValue(true);
});

/** A `Request` with a unique `X-Forwarded-For`, so each test owns its own rate-limit bucket. */
function requestFrom(ip: string): Request {
  return new Request("http://localhost/api/auth/callback/credentials", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("authorize() — wrong password", () => {
  it("rejects a wrong password for a real account", async () => {
    dbState.selectResults.push([
      { id: "u1", email: "ana@example.com", passwordHash: realHash, name: "Ana", image: null },
    ]);

    const result = await authorize(
      { email: "ana@example.com", password: "not the real password" },
      requestFrom("10.0.0.1"),
    );

    expect(result).toBeNull();
  });
});

describe("authorize() — unknown email", () => {
  it("rejects an email with no account, same shape as a wrong password", async () => {
    dbState.selectResults.push([]); // no row found

    const result = await authorize(
      { email: "nobody@example.com", password: REAL_PASSWORD },
      requestFrom("10.0.0.2"),
    );

    expect(result).toBeNull();
  });

  it("rejects an account that has no password (Google/Facebook-only)", async () => {
    dbState.selectResults.push([
      { id: "u2", email: "google-only@example.com", passwordHash: null, name: "G", image: null },
    ]);

    const result = await authorize(
      { email: "google-only@example.com", password: REAL_PASSWORD },
      requestFrom("10.0.0.3"),
    );

    expect(result).toBeNull();
  });
});

describe("authorize() — a real match", () => {
  it("returns the user for the right email + password", async () => {
    dbState.selectResults.push([
      { id: "u3", email: "ana@example.com", passwordHash: realHash, name: "Ana", image: null },
    ]);

    const result = await authorize(
      { email: "ana@example.com", password: REAL_PASSWORD },
      requestFrom("10.0.0.4"),
    );

    expect(result).toEqual({ id: "u3", name: "Ana", email: "ana@example.com", image: null });
  });
});

describe("registerCredentialsUser() — an email already taken by a Google account", () => {
  it("refuses rather than attaching a password to the existing row", async () => {
    // `users` carries no "how did this row start" column readable here — the
    // existing-email check is the same whichever provider created it, which
    // is the point: this is what stops a password silently becoming a second
    // way into an account someone made with Google.
    dbState.selectResults.push([{ id: "existing-google-user" }]);

    const result = await registerCredentialsUser("taken@example.com", "a-new-password1");

    expect(result).toEqual({ ok: false, error: "email-taken" });
    // And nothing gets written — the refusal is real, not cosmetic.
    expect(dbState.insertedRows).toEqual([]);
  });
});

describe("registerCredentialsUser() — a free email", () => {
  it("creates the account", async () => {
    dbState.selectResults.push([]); // no existing row

    const result = await registerCredentialsUser("nueva@example.com", "a-new-password1");

    expect(result).toEqual({ ok: true });
    expect(dbState.insertedRows).toHaveLength(1);
    expect(dbState.insertedRows[0]).toMatchObject({ email: "nueva@example.com" });
  });
});

describe("authorize() — R0-3's rate limit", () => {
  it(
    "stops answering after enough attempts from the same address, even with the right password",
    async () => {
      const ip = "10.0.0.99"; // a bucket of its own, untouched by the tests above
      for (let i = 0; i < AUTH_RATE_LIMIT; i++) {
        dbState.selectResults.push([
          { id: "u4", email: "ana@example.com", passwordHash: realHash, name: "Ana", image: null },
        ]);
        const result = await authorize(
          { email: "ana@example.com", password: REAL_PASSWORD },
          requestFrom(ip),
        );
        expect(result, `attempt ${i + 1} should still succeed`).not.toBeNull();
      }

      // One more from the same address, still with the right password: the
      // limiter — not the credentials — is what has to say no now.
      dbState.selectResults.push([
        { id: "u4", email: "ana@example.com", passwordHash: realHash, name: "Ana", image: null },
      ]);
      const oneTooMany = await authorize(
        { email: "ana@example.com", password: REAL_PASSWORD },
        requestFrom(ip),
      );
      expect(oneTooMany).toBeNull();
    },
    20_000,
  );

  it("keys the limit per address — a neighbour is unaffected", async () => {
    dbState.selectResults.push([
      { id: "u5", email: "ana@example.com", passwordHash: realHash, name: "Ana", image: null },
    ]);
    const result = await authorize(
      { email: "ana@example.com", password: REAL_PASSWORD },
      requestFrom("10.0.0.100"), // brand new bucket
    );
    expect(result).not.toBeNull();
  });
});
