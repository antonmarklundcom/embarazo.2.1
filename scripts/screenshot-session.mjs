// Shared by scripts/gen-screenshots.mjs (PWA install sheet) and
// scripts/gen-play-screenshots.mjs (Google Play listing): start a production
// server from this checkout, launch Chromium, and walk a fresh phone through
// onboarding the same way e2e/helpers/onboarding.ts does.
//
// The onboarding steps are a copy of that helper's "Mamá, by LMP" path, kept
// here because a plain Node script cannot import the e2e TypeScript helpers.
// If the onboarding flow changes, both places change (the e2e suite fails
// first, so the helper is the one to read).
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..");

// Linux sandbox image path used by earlier sessions. Anywhere else (Windows,
// macOS, a laptop) Playwright's own downloaded Chromium is used.
const LINUX_CHROMIUM_PATH = "/opt/pw-browsers/chromium";

/** True when nothing is listening on `port` on 127.0.0.1. */
export function portIsFree(port) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port, "127.0.0.1");
  });
}

/** The first free port from `candidates`, or an error naming all of them. */
export async function pickPort(candidates) {
  for (const port of candidates) {
    if (await portIsFree(port)) return port;
  }
  throw new Error(`No free port among ${candidates.join(", ")}`);
}

async function waitForServer(url, timeoutMs = 90_000) {
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

/**
 * Starts `next start` on `port` with the local-only settings the e2e suite
 * uses (no account required, a placeholder photo bucket). Runs Next's own bin
 * with this Node, not `npx`, so it works on Windows without a shell and
 * killing this one process really stops the server.
 */
export async function startServer(port) {
  if (!existsSync(join(ROOT, ".next", "BUILD_ID"))) {
    throw new Error("No production build. Run `npm run build` first.");
  }
  const nextBin = join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      AUTH_REQUIRE_ACCOUNT: "false",
      PHOTO_STORAGE_ENDPOINT: process.env.PHOTO_STORAGE_ENDPOINT ?? "https://bucket.example.test",
    },
  });
  const baseURL = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(baseURL);
  } catch (error) {
    server.kill();
    throw error;
  }
  return { baseURL, stop: () => server.kill() };
}

export function launchBrowser() {
  return chromium.launch({
    executablePath: existsSync(LINUX_CHROMIUM_PATH) ? LINUX_CHROMIUM_PATH : undefined,
  });
}

/** YYYY-MM-DD for the Asunción calendar day `daysFromToday` away. */
export function asuncionDate(daysFromToday) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + daysFromToday)).toISOString().slice(0, 10);
}

/**
 * Onboarding as a pregnant Mamá whose LMP was `daysAgo` days ago, no baby
 * name, the first department, no account, weekly notice declined. Ends on Hoy.
 */
export async function onboardAsMama(page, { daysAgo }) {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.locator("#lmp").fill(asuncionDate(-daysAgo));
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("heading", { name: "Contanos un poco más" }).waitFor();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuar" }).click();

  const accountHeading = page.getByRole("heading", {
    name: /Vista de prueba|Listo, ya entraste|Guardá tu embarazo y compartilo|Tu embarazo, organizado en un solo lugar/,
  });
  await accountHeading.or(page.locator("#babyName")).first().waitFor();
  if (await accountHeading.isVisible()) {
    const previewContinue = page.getByRole("button", { name: "Seguir sin cuenta", exact: true });
    if (await previewContinue.count()) await previewContinue.click();
    else await page.getByRole("button", { name: "Continuar", exact: true }).click();
  }

  await page.locator("#babyName").waitFor();
  await page.getByRole("button", { name: "Continuar" }).click();
  const weeklyNotice = page.getByRole("heading", { name: "¿Te aviso cuando empieza tu semana nueva?" });
  const finishInvite = page.getByRole("button", { name: "Empezar", exact: true });
  await weeklyNotice.or(finishInvite).first().waitFor();
  if (await finishInvite.isVisible()) await finishInvite.click();
  await weeklyNotice.waitFor();
  await page.getByRole("button", { name: "Ahora no" }).click();
  await page.getByText("Tip de hoy").waitFor();
}

/** Waits for web fonts and a quiet moment, so a capture is not mid-paint. */
export async function settle(page, ms = 800) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}
