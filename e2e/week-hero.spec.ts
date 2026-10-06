import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// U7 — the hero a woman actually chooses.
//
// The unit tests cover the arithmetic (`lib/hero/scale.test.ts`) and the theme
// table (`lib/hero/themes.test.ts`). What only a browser can prove is the part
// that makes the feature feel like hers: that picking a theme repaints the hero
// **without a reload**, and that the choice is still there tomorrow.
//
// That property is not incidental — it is why the preference lives on the Dexie
// profile row read through `useLiveQuery` rather than in a React context, and a
// regression here (a context, a prop drill, a reload) would look fine in review
// and feel broken on a phone.

test("choosing a theme repaints the hero, and it survives a reload", async ({
  page,
}) => {
  await completeOnboarding(page);

  const chip = page.getByRole("button", { name: "Cambiar el fondo" }).first();
  await expect(chip).toBeVisible();
  await chip.click();

  const sheet = page.getByRole("dialog", { name: "Fondo del bebé" });
  await expect(sheet).toBeVisible();

  // `halo` is the default every profile starts on.
  const halo = sheet.getByRole("button", { name: "Halo dorado" });
  const estrellas = sheet.getByRole("button", { name: "Noche estrellada" });
  await expect(halo).toHaveAttribute("aria-pressed", "true");
  await expect(estrellas).toHaveAttribute("aria-pressed", "false");

  await estrellas.click();

  // No reload, no navigation — the Dexie write repaints every subscriber.
  await expect(estrellas).toHaveAttribute("aria-pressed", "true");
  await expect(halo).toHaveAttribute("aria-pressed", "false");

  await sheet.getByRole("button", { name: "Listo" }).click();
  await expect(sheet).toBeHidden();

  await page.reload();
  await chip.click();
  await expect(
    page.getByRole("dialog", { name: "Fondo del bebé" }).getByRole("button", {
      name: "Noche estrellada",
    }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("the fruit toggle hides the comparison, and stays hidden", async ({
  page,
}) => {
  await completeOnboarding(page);

  await page.goto("/semana/24");
  // The <figure> is the drawing. Targeted as an element rather than by its
  // text, because the hero's own caption ("Del tamaño de una mandioca") names
  // the same item and is NOT what this toggle hides — the words stay, the
  // picture goes.
  const figure = page.locator("figure");
  await expect(figure).toHaveCount(1);

  await page.getByRole("button", { name: "Cambiar el fondo" }).first().click();
  const toggle = page.getByRole("switch", {
    name: "Mostrar la comparación de tamaño",
  });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  await page.getByRole("button", { name: "Listo" }).click();
  await expect(figure).toHaveCount(0);
  // The label is a fact about the week, not part of the drawing, so it stays.
  await expect(page.getByText("Del tamaño de una mandioca")).toBeVisible();

  await page.reload();
  await expect(page.locator("figure")).toHaveCount(0);
});

test("the same theme follows from home to a week page", async ({ page }) => {
  // One preference, two very different frames: a circle cut out of the
  // progress ring on the home screen, and the full card on /semana/[n]. A
  // theme that only applied to one of them would look like a bug.
  await completeOnboarding(page);

  await page.getByRole("button", { name: "Cambiar el fondo" }).first().click();
  await page.getByRole("button", { name: "Ñandutí" }).click();
  await page.getByRole("button", { name: "Listo" }).click();

  await page.goto("/semana/24");
  await page.getByRole("button", { name: "Cambiar el fondo" }).first().click();
  await expect(
    page.getByRole("dialog", { name: "Fondo del bebé" }).getByRole("button", {
      name: "Ñandutí",
    }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("the week page shows the baby beside this week's Paraguayan fruit, both loaded", async ({
  page,
}) => {
  // 2026-09-28: the cutout renders (`public/assets/semanas/`) and the size
  // comparisons (`public/assets/comparaciones/`) are on disk. The size is told
  // by the fruit or vegetable, drawn to scale beside the baby.
  await completeOnboarding(page);

  const cases: Array<[number, string]> = [
    [8, "poroto"],
    [20, "banana"],
    [42, "sandia-grande-y-madura"],
  ];
  for (const [week, item] of cases) {
    await page.goto(`/semana/${week}`);
    await expect(page.getByText(`SEMANA ${week} ·`)).toBeVisible();
    const figure = page.locator("figure");
    // N6: the week render carries a `?v=` revision so a re-drawn file reaches
    // phones that cached the old one; match the path, not the exact URL.
    for (const src of [`/assets/semanas/bebe-${week}.webp`, `/assets/comparaciones/${item}.webp`]) {
      const img = figure.locator(`img[src^="${src}"]`);
      await expect(img).toBeVisible();
      // Decoded, not just requested: a 404 would swap in the drawn fallback.
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    }
  }

  // Week 1: no embryo yet, so no figure and no size.
  await page.goto("/semana/1");
  await expect(page.getByText("SEMANA 1 ·")).toBeVisible();
  await expect(page.locator("figure")).toHaveCount(0);
});

test("Hoy shows this week's fruit on the ring", async ({ page }) => {
  // 136 days: 19+3, week 20, a banana.
  await completeOnboarding(page, { daysAgo: 136 });
  const badge = page.locator('img[src="/assets/comparaciones/banana.webp"]');
  await expect(badge).toBeVisible();
  await expect.poll(() => badge.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
});

test.describe("with the week image unavailable", () => {
  // The 404 below is faked with page.route, and once the app's service worker
  // controls the page its image requests no longer pass through page.route —
  // the real file loads and the test sees it (CI run #317). Blocking the worker
  // for this one test keeps the fake 404 the only answer.
  test.use({ serviceWorkers: "block" });

  test("the hero still looks finished when a week's image is missing", async ({ page }) => {
    // The fallback is no longer what everybody sees, but a failed or blocked
    // fetch still lands here, and it has to look deliberate rather than broken.
    await page.route(/\/assets\/semanas\/bebe-\d+\.webp(\?.*)?$/, (route) =>
      route.fulfill({ status: 404, body: "" }),
    );
    await completeOnboarding(page);
    await page.goto("/semana/24");

    // The week number stands in for the render, and every caption still reads.
    await expect(page.getByText("SEMANA 24 · 2.º TRIMESTRE")).toBeVisible();
    await expect(page.getByText("Del tamaño de una mandioca")).toBeVisible();
    await expect(page.locator('img[src^="/assets/semanas/bebe-24.webp"]')).toBeHidden();
  });
});
