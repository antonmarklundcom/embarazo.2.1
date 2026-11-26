import { test, expect, type Page } from "@playwright/test";

import { serveClientFlags } from "./helpers/flags";
import { completeOnboarding } from "./helpers/onboarding";
import { HOME_SECTION_TITLES, homeSectionButton, openHomeSection } from "./helpers/homeSections";

// "Hoy corto" — the pregnancy home is the week hero, "Hoy" (three things for
// today) and the stories; the rest sits in five rows that open on tap
// (components/home/HomeSection.tsx, lib/home/openSections.ts).

// Week 24+3 on the day of the run, the week the owner reviewed the layout at.
const DAYS_AGO = 24 * 7 + 3;

function panelOf(page: Page, title: (typeof HOME_SECTION_TITLES)[number]) {
  return homeSectionButton(page, title)
    .getAttribute("aria-controls")
    .then((id) => page.locator(`[id="${id}"]`));
}

/** A real tap at the centre of an element, wherever the browser routes it. */
async function tapCentre(page: Page, selector: ReturnType<Page["locator"]>) {
  // Centred, so the fixed bottom bar cannot sit on top of it.
  await selector.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const box = await selector.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
}

function rowOf(page: Page, title: (typeof HOME_SECTION_TITLES)[number]) {
  return page.locator("[data-home-section]").filter({ has: homeSectionButton(page, title) });
}

test("every row starts closed, and nothing inside is rendered until it opens", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: DAYS_AGO });

  await expect(page.locator("[data-home-section]")).toHaveCount(HOME_SECTION_TITLES.length);
  for (const title of HOME_SECTION_TITLES) {
    const button = homeSectionButton(page, title);
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "false");
    const panel = await panelOf(page, title);
    await expect(panel).toBeHidden();
    // Not just hidden: not mounted.
    expect(await panel.evaluate((el) => el.childElementCount)).toBe(0);
  }
  await expect(page.getByRole("region", { name: "Accesos rápidos" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Esta semana, para cada uno", exact: true })).toHaveCount(0);

  await openHomeSection(page, "Herramientas");
  await expect(page.getByRole("region", { name: "Accesos rápidos" })).toBeVisible();
  // The other rows stay closed and empty.
  expect(await (await panelOf(page, "Tu semana")).evaluate((el) => el.childElementCount)).toBe(0);
});

test("a tap on the title, on the hint or on the chevron opens the row", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await completeOnboarding(page, { daysAgo: DAYS_AGO });

  // Title: the button's own text. A tap opens the row in place: the page does
  // not scroll.
  const title = homeSectionButton(page, "Herramientas");
  await title.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const before = await page.evaluate(() => window.scrollY);
  await title.click();
  await expect(title).toHaveAttribute("aria-expanded", "true");
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);

  // Hint: the line under the title.
  const hintRow = rowOf(page, "En Paraguay");
  await tapCentre(page, hintRow.locator("p").first());
  await expect(homeSectionButton(page, "En Paraguay")).toHaveAttribute("aria-expanded", "true");

  // Chevron: the arrow on the right.
  const chevronRow = rowOf(page, "Más");
  await tapCentre(page, chevronRow.locator("svg[data-chevron]"));
  await expect(homeSectionButton(page, "Más")).toHaveAttribute("aria-expanded", "true");

  // And a second tap closes it again.
  await tapCentre(page, chevronRow.locator("svg[data-chevron]"));
  await expect(homeSectionButton(page, "Más")).toHaveAttribute("aria-expanded", "false");
});

test("an opened row is still open after a trip to Herramientas and back with the bottom bar", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: DAYS_AGO });
  await openHomeSection(page, "Tu semana");
  await expect(page.getByRole("region", { name: "Esta semana, para cada uno", exact: true })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await nav.getByRole("link", { name: "Herramientas" }).click();
  await expect(page).toHaveURL(/\/herramientas$/);
  await expect(page.getByRole("region", { name: "Para ahora" })).toBeVisible();
  await nav.getByRole("link", { name: "Hoy" }).click();
  await expect(page).toHaveURL(/\/$/);

  await expect(homeSectionButton(page, "Tu semana")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Esta semana, para cada uno", exact: true })).toBeVisible();
  await expect(homeSectionButton(page, "Herramientas")).toHaveAttribute("aria-expanded", "false");

  // Memory only: a reload starts closed, and nothing was written to storage.
  await page.reload();
  await expect(homeSectionButton(page, "Tu semana")).toHaveAttribute("aria-expanded", "false");
  const stored = await page.evaluate(() =>
    [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((key) =>
      /secci|section|abrir/i.test(key),
    ),
  );
  expect(stored).toEqual([]);
});

test("at 360x740 «Hoy» starts within the first 1,000 px and the closed page stays under 2,400 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await completeOnboarding(page, { daysAgo: DAYS_AGO });
  const heading = page.getByRole("heading", { name: "Hoy", exact: true });
  await expect(heading).toBeVisible();
  await expect(page.getByRole("region", { name: "Tu semana en historias" })).toBeVisible();
  for (const title of HOME_SECTION_TITLES) {
    await expect(homeSectionButton(page, title)).toHaveAttribute("aria-expanded", "false");
  }

  const top = await heading.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  expect(top).toBeLessThan(1000);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(height).toBeLessThan(2400);
});

test("with the Pregunta del día on, the closed page at 360x740 stays under 2,650 px", async ({ page, context }) => {
  await serveClientFlags(context, { pregunta_del_dia: true });
  await page.setViewportSize({ width: 360, height: 740 });
  await completeOnboarding(page, { daysAgo: DAYS_AGO });
  await expect(page.getByRole("region", { name: "Pregunta del día" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Tu semana en historias" })).toBeVisible();
  for (const title of HOME_SECTION_TITLES) {
    await expect(homeSectionButton(page, title)).toHaveAttribute("aria-expanded", "false");
  }

  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(height).toBeLessThan(2650);
});

test("a link to /#abrir=<row> opens that row on arrival and leaves a clean URL", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: DAYS_AGO });

  // The weekly push ("¡Empieza tu semana N!") lands here.
  await page.goto("/#abrir=tu-semana");
  await expect(homeSectionButton(page, "Tu semana")).toHaveAttribute("aria-expanded", "true");
  // Scrolled to: the row's button is on screen, below the sticky header.
  await expect(homeSectionButton(page, "Tu semana")).toBeInViewport();
  await expect
    .poll(async () => {
      const header = await page.locator("header.sticky").boundingBox();
      const row = await homeSectionButton(page, "Tu semana").boundingBox();
      return row!.y >= header!.y + header!.height;
    })
    .toBe(true);
  await expect(page.getByRole("region", { name: "Esta semana", exact: true })).toBeVisible();
  await expect(homeSectionButton(page, "Acompañada")).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");

  // A notification tapped while Hoy is already open only changes the fragment.
  await page.evaluate(() => {
    window.location.hash = "abrir=acompanada";
  });
  await expect(homeSectionButton(page, "Acompañada")).toHaveAttribute("aria-expanded", "true");
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");

  // An unknown row is ignored, and a fresh load still starts closed. (From
  // another path: "/" to "/#…" would only change the fragment, not load.)
  await page.goto("/herramientas");
  await page.goto("/#abrir=nada");
  await expect(page.getByRole("heading", { name: "Hoy", exact: true })).toBeVisible();
  for (const title of HOME_SECTION_TITLES) {
    await expect(homeSectionButton(page, title)).toHaveAttribute("aria-expanded", "false");
  }
});

test("keyboard: Enter opens the row, focus stays on it with the app's focus ring", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: DAYS_AGO });
  const button = homeSectionButton(page, "Herramientas");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Accesos rápidos" })).toBeVisible();
  await expect(button).toBeFocused();

  const ring = await button.evaluate((el) => {
    const after = getComputedStyle(el, "::after");
    return {
      focusVisible: el.matches(":focus-visible"),
      style: after.outlineStyle,
      width: after.outlineWidth,
      color: after.outlineColor,
    };
  });
  // globals.css: 3px solid #2F5D50 (petrol) — drawn round the whole row.
  expect(ring).toEqual({ focusVisible: true, style: "solid", width: "3px", color: "rgb(47, 93, 80)" });

  await page.keyboard.press("Space");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("the chevron does not animate under prefers-reduced-motion", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: DAYS_AGO });
  const chevron = rowOf(page, "Tu semana").locator("svg[data-chevron]");
  const animated = await chevron.evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(animated).not.toBe("none");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => chevron.evaluate((el) => getComputedStyle(el).transitionProperty))
    .toBe("none");
});
