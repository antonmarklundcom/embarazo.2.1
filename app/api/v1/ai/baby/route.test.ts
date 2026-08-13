import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// NextAuth's entrypoint cannot be imported outside a Next build (it resolves
// `next/server` in a way vitest's node environment does not), so the auth
// module is stubbed here. Nothing under test lives in it: `isAuthAvailable` is
// a configuration read, and "no session" is exactly the state these cases want.
vi.mock("@/lib/server/auth", () => ({
  isAuthAvailable: () => Boolean(process.env.AUTH_SECRET),
  getSession: async () => null,
}));

import { GET, POST } from "./route";

// BUILD-PLAN F1/F2 at the route edge. The quota arithmetic is tested in
// `lib/ai/quota.test.ts` and its enforcement in `lib/server/aiBaby.test.ts`;
// what is left here is what only the route decides — that the kill switch wins
// before anything else runs, and that the quota endpoint added in F2 takes no
// parameters, like every route since J3.

const env = process.env;

function req(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/ai/baby", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  process.env = env;
});

describe("with the feature switched off", () => {
  beforeEach(() => {
    process.env = { ...env, AI_BABY_ENABLED: "false", GEMINI_API_KEY: "k" };
  });

  it("does not exist — neither verb, no 403 to probe", async () => {
    expect((await GET(req("/api/v1/ai/baby"))).status).toBe(404);
    expect((await POST(post({ consent: "acepto" }))).status).toBe(404);
  });
});

describe("the quota endpoint takes no parameters (J3)", () => {
  beforeEach(() => {
    // Enough configuration to get past the kill switch and the auth check.
    // `db()` builds a pool lazily and connects on first query, and a rejected
    // parameter never reaches one.
    process.env = {
      ...env,
      AI_BABY_ENABLED: "true",
      GEMINI_API_KEY: "k",
      AUTH_SECRET: "test-secret",
      AUTH_GOOGLE_ID: "id",
      AUTH_GOOGLE_SECRET: "secret",
      DATABASE_URL: "mysql://user:pass@127.0.0.1:3306/test",
    };
  });

  it("rejects anything it might be asked to filter by", async () => {
    for (const param of ["userId=someone", "week=24", "month=2026-08"]) {
      const res = await GET(req(`/api/v1/ai/baby?${param}`));
      expect(res.status, `${param} must be rejected`).toBe(400);
    }
  });

  it("needs a session — the user id never comes from the request", async () => {
    const res = await GET(req("/api/v1/ai/baby"));
    expect(res.status).toBe(401);
  });

  it("never caches a quota answer", async () => {
    const res = await GET(req("/api/v1/ai/baby?week=24"));
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
