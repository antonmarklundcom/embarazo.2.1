// Generates real app screenshots for the PWA manifest's install sheet
// (P1.4, BUILD-PLAN.md). Starts a production server, completes onboarding,
// captures Home + Herramientas, and writes them to public/screenshots/.
// File names and sizes are the ones app/manifest.webmanifest declares
// (lib/seoRoutes.test.ts checks them): home.png and herramientas.png at
// 390x844, semana-wide.png at 1280x800.
//
// The Google Play listing's phone screenshots are a separate set:
// scripts/gen-play-screenshots.mjs.
//
// Usage: npm run build && node scripts/gen-screenshots.mjs [--wide-only]
// Port: 3100, or the next free one of 3211-3215 (SCREENSHOT_PORT overrides).
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { ROOT, launchBrowser, onboardAsMama, pickPort, settle, startServer } from "./screenshot-session.mjs";

const OUT = join(ROOT, "public", "screenshots");
mkdirSync(OUT, { recursive: true });

const ports = process.env.SCREENSHOT_PORT
  ? [Number(process.env.SCREENSHOT_PORT)]
  : [3100, 3211, 3212, 3213, 3214, 3215];
const { baseURL, stop } = await startServer(await pickPort(ports));

const browser = await launchBrowser();
try {
  // Night run item 5 — the wide (desktop install sheet) screenshot: a public
  // week page, which needs no onboarding. `--wide-only` writes just this one.
  const wideContext = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 800 },
    locale: "es-PY",
    timezoneId: "America/Asuncion",
  });
  const wide = await wideContext.newPage();
  await wide.goto("/semana/20", { waitUntil: "load" });
  // Not "networkidle": the service worker's precache keeps the network busy.
  await wide.getByText("Para tu pareja y tu familia").waitFor();
  await settle(wide, 1500);
  await wide.screenshot({ path: join(OUT, "semana-wide.png") });
  console.log("Wrote public/screenshots/semana-wide.png");
  await wideContext.close();

  if (!process.argv.includes("--wide-only")) {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      locale: "es-PY",
      timezoneId: "America/Asuncion",
    });
    const page = await context.newPage();

    // 140 days since the LMP, the same date the first set of these used.
    await onboardAsMama(page, { daysAgo: 140 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page);
    await page.screenshot({ path: join(OUT, "home.png") });
    console.log("Wrote public/screenshots/home.png");

    await page.goto("/herramientas");
    await page.getByRole("heading", { name: "Herramientas", level: 1 }).waitFor();
    await settle(page);
    await page.screenshot({ path: join(OUT, "herramientas.png") });
    console.log("Wrote public/screenshots/herramientas.png");
    await context.close();
  }
} finally {
  await browser.close();
  stop();
}
