#!/usr/bin/env node
// L1 — deploy-day smoke check for a live Mi Bebé deployment.
//
// Usage: node scripts/smoke-live.mjs https://<host>
//
// Runs, against the deployed site, the checks a person would otherwise do by
// hand on deploy day (docs/PLAN-2026-09-13-GO-LIVE.md §2.2, item L1): plain
// pages resolve, the enforced CSP header is present with no Report-Only
// header left behind, the manifest and service worker are served correctly,
// the directory API's parameter whitelist behaves (app/api/v1/directory/
// route.ts currently accepts *no* query parameters at all — see the comment
// in checkDirectoryBad below), the auth-providers route reports its state
// either way, and the account-deletion page actually has a way to reach a
// human. Zero dependencies: global `fetch` only, Node >=22.
//
// Every request gets its own 15s timeout so one hung request cannot hang the
// whole run.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const TIMEOUT_MS = 15_000;

// Plain pages that just need to resolve. `/` doubles as the CSP check below.
const SIMPLE_PAGES = [
  "/",
  "/semana/20",
  "/herramientas",
  "/conoce",
  "/borrar-cuenta",
  "/privacidad",
];

function errMessage(err) {
  return err instanceof Error ? err.message : String(err);
}

function result(name, pass, detail) {
  return { name, pass, detail };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The manifest `name` this deployment is expected to serve. `lib/brand.ts`
 * (U8) does not exist yet, so this reads the `name` field baked into
 * `app/manifest.webmanifest` in this checkout instead. Once U8 lands, this
 * picks up its exported name via a light regex — no TypeScript execution,
 * to keep this script dependency-free — and that regex is the thing to
 * revisit if U8 ships a shape other than `name: "..."`.
 */
function expectedManifestName() {
  try {
    const src = readFileSync(join(REPO_ROOT, "lib", "brand.ts"), "utf8");
    const match = src.match(/name\s*[:=]\s*["'`]([^"'`]+)["'`]/);
    if (match) return match[1];
  } catch {
    // lib/brand.ts does not exist yet (pre-U8) — fall through.
  }
  const manifest = JSON.parse(
    readFileSync(join(REPO_ROOT, "app", "manifest.webmanifest"), "utf8"),
  );
  return manifest.name;
}

async function checkPage(base, path) {
  try {
    const res = await fetchWithTimeout(new URL(path, base));
    return { res, check: result(`GET ${path}`, res.status === 200, `HTTP ${res.status}`) };
  } catch (err) {
    return { res: null, check: result(`GET ${path}`, false, errMessage(err)) };
  }
}

function checkCsp(res) {
  const name = "Content-Security-Policy (on /)";
  if (!res) return result(name, false, "no response — see GET / above");
  const csp = res.headers.get("content-security-policy");
  const reportOnly = res.headers.get("content-security-policy-report-only");
  if (!csp) return result(name, false, "header missing");
  if (reportOnly) return result(name, false, "Report-Only header still present");
  return result(name, true, "enforced header present, no Report-Only header");
}

async function checkManifest(base) {
  const name = "/manifest.webmanifest";
  try {
    const res = await fetchWithTimeout(new URL("/manifest.webmanifest", base));
    if (res.status !== 200) return result(name, false, `HTTP ${res.status}`);
    let manifest;
    try {
      manifest = await res.json();
    } catch {
      return result(name, false, "response is not valid JSON");
    }
    const expected = expectedManifestName();
    if (manifest.name !== expected) {
      return result(name, false, `name "${manifest.name}" != expected "${expected}"`);
    }
    return result(name, true, `name matches (${expected})`);
  } catch (err) {
    return result(name, false, errMessage(err));
  }
}

async function checkServiceWorker(base) {
  const name = "/sw.js content-type";
  try {
    const res = await fetchWithTimeout(new URL("/sw.js", base));
    if (res.status !== 200) return result(name, false, `HTTP ${res.status}`);
    const type = res.headers.get("content-type") || "";
    if (!/javascript/i.test(type)) return result(name, false, `content-type "${type}" is not JS`);
    return result(name, true, `content-type ${type}`);
  } catch (err) {
    return result(name, false, errMessage(err));
  }
}

async function checkDirectoryGood(base) {
  const name = "GET /api/v1/directory";
  try {
    const res = await fetchWithTimeout(new URL("/api/v1/directory", base));
    if (res.status !== 200) return result(name, false, `HTTP ${res.status}`);
    try {
      await res.json();
    } catch {
      return result(name, false, "response is not valid JSON");
    }
    return result(name, true, "200 JSON");
  } catch (err) {
    return result(name, false, errMessage(err));
  }
}

// app/api/v1/directory/route.ts (J3) rejects *any* query parameter — it used
// to whitelist `department`/`category`/`q`, but now takes none at all, on
// purpose (a location-shaped parameter costs the Play "no data collected"
// badge). So the "good" request is a bare `/api/v1/directory` (checked
// above) and any parameter at all is the "bad" one this checks. The older
// `?department=central&trimester=2` example in the plan doc predates that
// change; `foo=1` below matches the whitelist as it exists in the route
// today.
async function checkDirectoryBad(base) {
  const name = "GET /api/v1/directory?foo=1";
  try {
    const res = await fetchWithTimeout(new URL("/api/v1/directory?foo=1", base));
    return result(name, res.status === 400, `HTTP ${res.status}`);
  } catch (err) {
    return result(name, false, errMessage(err));
  }
}

async function checkAuthProviders(base) {
  const name = "/api/auth/providers";
  try {
    const res = await fetchWithTimeout(new URL("/api/auth/providers", base));
    if (res.status === 404) return result(name, true, "404 — local-only build (accounts off)");
    if (res.status === 200) return result(name, true, "200 — accounts on");
    return result(name, false, `HTTP ${res.status}`);
  } catch (err) {
    return result(name, false, errMessage(err));
  }
}

function checkDeletionChannel(text) {
  const name = "/borrar-cuenta has a support channel";
  if (text == null) return result(name, false, "no response — see GET /borrar-cuenta above");
  if (/Falta configurar/.test(text)) return result(name, false, "page reports no channel configured");
  if (/mailto:/.test(text) || /wa\.me\//.test(text)) return result(name, true, "found a mailto: or wa.me link");
  return result(name, false, "no mailto: or wa.me link found in the page");
}

export async function runChecks(base) {
  const checks = [];
  const pageResponses = {};

  for (const path of SIMPLE_PAGES) {
    const { res, check } = await checkPage(base, path);
    pageResponses[path] = res;
    checks.push(check);
  }

  checks.push(checkCsp(pageResponses["/"]));

  let borrarText = null;
  const borrarRes = pageResponses["/borrar-cuenta"];
  if (borrarRes) {
    try {
      borrarText = await borrarRes.text();
    } catch {
      borrarText = null;
    }
  }
  checks.push(checkDeletionChannel(borrarText));

  checks.push(await checkManifest(base));
  checks.push(await checkServiceWorker(base));
  checks.push(await checkDirectoryGood(base));
  checks.push(await checkDirectoryBad(base));
  checks.push(await checkAuthProviders(base));

  return checks;
}

function printTable(checks) {
  const nameWidth = Math.max(...checks.map((c) => c.name.length));
  for (const c of checks) {
    const status = c.pass ? "PASS" : "FAIL";
    console.log(`${status}  ${c.name.padEnd(nameWidth)}  ${c.detail}`);
  }
}

export async function main(argv) {
  const target = argv[2];
  if (!target) {
    console.log("Usage: node scripts/smoke-live.mjs https://<host>");
    return 2;
  }

  let base;
  try {
    base = new URL(target);
  } catch {
    console.error(`Not a valid URL: ${target}`);
    return 2;
  }

  console.log(`Smoke-testing ${base.origin}`);
  const checks = await runChecks(base);
  printTable(checks);

  const failed = checks.filter((c) => !c.pass).length;
  console.log(`${checks.length - failed}/${checks.length} checks passed`);

  return failed === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv).then((code) => process.exit(code));
}
