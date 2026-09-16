import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { main } from "./smoke-live.mjs";

// L1 — scripts/smoke-live.mjs. This lives under scripts/, not lib/, because
// it tests a script rather than an importable library module; it still
// matches vitest.config.mts's `include: ["**/*.test.ts"]`, so `npm test`
// picks it up with no config change.

const BASE = "https://app.example.com";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function htmlResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/html" },
    ...init,
  });
}

const HOME_HEADERS_GOOD = {
  "content-type": "text/html",
  "content-security-policy": "default-src 'self'",
};

const BORRAR_CUENTA_HTML_GOOD =
  '<a href="mailto:hola@mibebe.example.py">Escribir</a>';

// U8: matches app/manifest.webmanifest's `name`, which is APP_TITLE
// (lib/brand.ts) — expectedManifestName() falls back to reading that file
// from disk since lib/brand.ts's regex doesn't match a template literal.
const MANIFEST_NAME = "Mi Bebé · Embarazo Paraguay";

/** A fetch stub keyed by pathname, with sane defaults for every check this
 * script runs. Individual tests override just the path they care about. */
function makeFetch(overrides: Record<string, () => Response> = {}) {
  const defaults: Record<string, () => Response> = {
    "/": () => new Response("<html>home</html>", { status: 200, headers: HOME_HEADERS_GOOD }),
    "/semana/20": () => htmlResponse("<html>semana</html>"),
    "/herramientas": () => htmlResponse("<html>herramientas</html>"),
    "/conoce": () => htmlResponse("<html>conoce</html>"),
    "/borrar-cuenta": () => htmlResponse(BORRAR_CUENTA_HTML_GOOD),
    "/privacidad": () => htmlResponse("<html>privacidad</html>"),
    "/manifest.webmanifest": () => jsonResponse({ name: MANIFEST_NAME }),
    "/sw.js": () =>
      new Response("self.addEventListener('fetch', () => {});", {
        status: 200,
        headers: { "content-type": "application/javascript" },
      }),
    "/api/v1/directory": () => jsonResponse({ listings: [] }),
    "/api/v1/directory?foo=1": () =>
      new Response(JSON.stringify({ error: "parámetro no permitido: foo" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    "/api/auth/providers": () => new Response("not found", { status: 404 }),
  };

  const handlers = { ...defaults, ...overrides };

  return vi.fn(async (input: string | URL) => {
    const url = new URL(input);
    const key = url.search ? `${url.pathname}${url.search}` : url.pathname;
    const handler = handlers[key];
    if (!handler) {
      throw new Error(`unexpected fetch to ${key}`);
    }
    return handler();
  });
}

describe("smoke-live", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("exits 0 when every check passes", async () => {
    globalThis.fetch = makeFetch() as unknown as typeof fetch;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const code = await main(["node", "smoke-live.mjs", BASE]);

    expect(code).toBe(0);
    logSpy.mockRestore();
  });

  it("fails the CSP row when the header is missing", async () => {
    globalThis.fetch = makeFetch({
      "/": () => new Response("<html>home</html>", { status: 200, headers: { "content-type": "text/html" } }),
    }) as unknown as typeof fetch;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const code = await main(["node", "smoke-live.mjs", BASE]);

    expect(code).toBe(1);
    const output = logSpy.mock.calls.map((call: unknown[]) => call.join(" ")).join("\n");
    expect(output).toMatch(/FAIL.*Content-Security-Policy/);
    logSpy.mockRestore();
  });

  it("fails only that row when a page 500s", async () => {
    globalThis.fetch = makeFetch({
      "/herramientas": () => new Response("boom", { status: 500 }),
    }) as unknown as typeof fetch;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const code = await main(["node", "smoke-live.mjs", BASE]);

    expect(code).toBe(1);
    const output = logSpy.mock.calls.map((call: unknown[]) => call.join(" ")).join("\n");
    expect(output).toMatch(/FAIL {2}GET \/herramientas\s+HTTP 500/);
    expect(output).toMatch(/PASS {2}GET \/\s+HTTP 200/);
    logSpy.mockRestore();
  });

  it("reports a 404 on auth providers as local-only and passes", async () => {
    globalThis.fetch = makeFetch({
      "/api/auth/providers": () => new Response("not found", { status: 404 }),
    }) as unknown as typeof fetch;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const code = await main(["node", "smoke-live.mjs", BASE]);

    expect(code).toBe(0);
    const output = logSpy.mock.calls.map((call: unknown[]) => call.join(" ")).join("\n");
    expect(output).toMatch(/PASS.*\/api\/auth\/providers.*local-only/);
    logSpy.mockRestore();
  });

  it("prints usage and returns 2 with no URL argument", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const code = await main(["node", "smoke-live.mjs"]);

    expect(code).toBe(2);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Usage/));
    logSpy.mockRestore();
  });
});
