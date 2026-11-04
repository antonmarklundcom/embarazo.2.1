// Generates real app screenshots for the PWA manifest's install sheet
// (P1.4, BUILD-PLAN.md). Starts a production server, completes onboarding,
// captures Home + Herramientas, and writes them to public/screenshots/.
//
// Usage: npm run build && node scripts/gen-screenshots.mjs
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "screenshots");
mkdirSync(OUT, { recursive: true });

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CHROMIUM_PATH = "/opt/pw-browsers/chromium";

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server did not start in time");
}

// Spawn `next start` directly (not via `npm run start`) so killing this
// one process actually stops the server — npm's wrapper process doesn't
// reliably forward SIGTERM to its child.
const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  cwd: ROOT,
  stdio: "inherit",
});

try {
  await waitForServer(BASE_URL);

  const browser = await chromium.launch({
    executablePath: existsSync(CHROMIUM_PATH) ? CHROMIUM_PATH : undefined,
  });
  // Night run item 5 — the wide (desktop install sheet) screenshot: a public
  // week page, which needs no onboarding. `--wide-only` writes just this one.
  const wide = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await wide.goto(BASE_URL + "/semana/20", { waitUntil: "load" });
  // Not "networkidle": the service worker's precache keeps the network busy.
  await wide.getByText("Para tu pareja y tu familia").waitFor();
  await wide.waitForTimeout(1500);
  await wide.screenshot({ path: join(OUT, "semana-wide.png") });
  console.log("Wrote public/screenshots/semana-wide.png");
  await wide.close();
  if (!process.argv.includes("--wide-only")) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(BASE_URL + "/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  const lmp = new Date(Date.now() - 140 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByText("Tip de hoy").waitFor();
  await page.screenshot({ path: join(OUT, "home.png") });
  console.log("Wrote public/screenshots/home.png");

  await page.goto(BASE_URL + "/herramientas");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: join(OUT, "herramientas.png") });
  console.log("Wrote public/screenshots/herramientas.png");
  }

  await browser.close();
} finally {
  server.kill();
}
