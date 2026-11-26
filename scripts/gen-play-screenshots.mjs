// Phone screenshots for the Google Play listing (docs/PLAY-STORE-SUBMISSION.md
// §5). Eight PNGs at 1080x1920 (9:16): a 360x640 CSS viewport at device scale
// factor 3, from a production build of this checkout.
//
// The phone is seeded the way a real user would get there: onboarding as Mamá
// around week 24, a next control noted on Hoy, a mood for today, and three
// items ticked in the hospital bag. No name is typed anywhere, and no caption
// or frame is added: Play wants the real app, and the app's own header and
// bottom bar stay in the picture.
//
// Usage: npm run build && npm run gen:play-screenshots
// Port: 3211, or the next free one up to 3215 (PLAY_SCREENSHOT_PORT overrides).
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  ROOT,
  asuncionDate,
  launchBrowser,
  onboardAsMama,
  pickPort,
  settle,
  startServer,
} from "./screenshot-session.mjs";

const OUT = join(ROOT, "android", "store-listing", "screenshots");
mkdirSync(OUT, { recursive: true });

const WEEK = 24;
// Week 24, day 3: far enough into the week that "Hoy" reads as a real day.
const DAYS_AGO = (WEEK - 1) * 7 + 3;

const ports = process.env.PLAY_SCREENSHOT_PORT
  ? [Number(process.env.PLAY_SCREENSHOT_PORT)]
  : [3211, 3212, 3213, 3214, 3215];
const { baseURL, stop } = await startServer(await pickPort(ports));

// The listing asks for files under 500 KB each. A screen that is mostly a
// photo (the week render on Hoy and the week page) comes out of Chromium near
// 900 KB, so those are re-encoded as a 256-colour PNG with sharp, which Next
// already installs for image optimisation (no dependency is added for this).
const MAX_BYTES = 500 * 1024;
async function shrinkIfNeeded(path) {
  if (statSync(path).size <= MAX_BYTES) return;
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.warn(`sharp is not installed; ${path} stays as Chromium wrote it`);
    return;
  }
  const smaller = await sharp(readFileSync(path))
    .png({ palette: true, quality: 100, colours: 256, dither: 1, effort: 10, compressionLevel: 9 })
    .toBuffer();
  writeFileSync(path, smaller);
}

const written = [];
async function shoot(page, name) {
  await settle(page);
  const path = join(OUT, name);
  await page.screenshot({ path, animations: "disabled", caret: "hide" });
  await shrinkIfNeeded(path);
  written.push({ name, bytes: statSync(path).size });
  console.log(`Wrote android/store-listing/screenshots/${name}`);
}

/** Scrolls so `locator` sits just under the app header. */
async function scrollUnderHeader(page, locator) {
  await locator.evaluate((el) => {
    const header = document.querySelector("header");
    const offset = header && getComputedStyle(header).position === "sticky" ? header.getBoundingClientRect().height : 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset - 12, behavior: "instant" });
  });
}

const browser = await launchBrowser();
try {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "es-PY",
    timezoneId: "America/Asuncion",
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await onboardAsMama(page, { daysAgo: DAYS_AGO });

  // Seed: a next control in five days, and today's mood.
  const control = page.getByRole("region", { name: "Próximo control" });
  await control.getByRole("button", { name: "Anotar" }).click();
  await control.getByLabel("Fecha del control").fill(asuncionDate(5));
  await control.getByLabel("Hora (opcional)").fill("09:30");
  await control.getByRole("button", { name: "Guardar" }).click();
  await control.getByText("En 5 días").waitFor();
  await page.getByRole("button", { name: "Bien", exact: true }).first().click();
  await page.getByText("Anotado. Gracias por contarnos.").waitFor();

  // Seed: three things already in the hospital bag.
  await page.goto("/herramientas/checklist");
  for (const item of ["Cédula de identidad", "Carné perinatal con tus controles", "Estudios y ecografías recientes"]) {
    const button = page.getByRole("button", { name: item, exact: true });
    await button.click();
    await page.waitForFunction(
      (label) => [...document.querySelectorAll("button[aria-pressed]")].some((b) => b.textContent?.includes(label) && b.getAttribute("aria-pressed") === "true"),
      item,
    );
  }

  // 1. Hoy, top.
  await page.goto("/");
  await page.getByText("Tip de hoy").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shoot(page, "01-hoy.png");

  // 2. Hoy, scrolled to the "Hoy" block: next control, tip of the day, mood.
  // At 360x640 the block fills the screen, so the closed rows below it (Tu
  // semana, Herramientas, Acompañada, En Paraguay, Más) are not in this one.
  await scrollUnderHeader(page, page.locator("#hoy-para-vos"));
  await shoot(page, "02-hoy-bloque.png");

  // 3. A week page.
  await page.goto(`/semana/${WEEK}`);
  await page.getByText("Para tu pareja y tu familia").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shoot(page, "03-semana.png");

  // 4. The tools grid.
  await page.goto("/herramientas");
  await page.getByRole("heading", { name: "Herramientas", level: 1 }).waitFor();
  await shoot(page, "04-herramientas.png");

  // 5. "Para conversar".
  await page.goto("/herramientas/conversar");
  await page.getByRole("heading", { name: "Para conversar", level: 1 }).waitFor();
  await shoot(page, "05-para-conversar.png");

  // 6. The checklist, on the hospital bag.
  await page.goto("/herramientas/checklist");
  await page.getByRole("heading", { name: "Bolso para el parto" }).waitFor();
  await shoot(page, "06-checklist-bolso.png");

  // 7. Derechos.
  await page.goto("/derechos");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await shoot(page, "07-derechos.png");

  // 8. Emergencia.
  await page.goto("/emergencia");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await shoot(page, "08-emergencia.png");

  await context.close();
} finally {
  await browser.close();
  stop();
}

const total = written.reduce((sum, file) => sum + file.bytes, 0);
for (const file of written) console.log(`${file.name}  ${Math.round(file.bytes / 1024)} KB`);
console.log(`Total ${Math.round(total / 1024)} KB`);
const tooBig = written.filter((file) => file.bytes > 500 * 1024);
if (tooBig.length) {
  console.error(`Over 500 KB: ${tooBig.map((file) => file.name).join(", ")}`);
  process.exitCode = 1;
}
