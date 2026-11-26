import { test, expect } from "@playwright/test";

// BUILD-PLAN D1 (feature map #20): three per row, every tool reachable, and the
// sentences that used to be the whole screen still available to a screen
// reader rather than deleted.

test("the toolbox is a grid and every tile leads somewhere", async ({ page }) => {
  await page.goto("/herramientas");

  const tiles = page.locator("main a[href^='/']");
  await expect(tiles.first()).toBeVisible();
  const count = await tiles.count();
  expect(count).toBeGreaterThanOrEqual(11);

  // Three per row: the first three tiles share a top edge, the fourth does not.
  const boxes = await Promise.all(
    [0, 1, 2, 3].map(async (i) => (await tiles.nth(i).boundingBox())!),
  );
  expect(boxes[1]!.y).toBeCloseTo(boxes[0]!.y, 0);
  expect(boxes[2]!.y).toBeCloseTo(boxes[0]!.y, 0);
  expect(boxes[3]!.y).toBeGreaterThan(boxes[0]!.y);

  await page.getByRole("link", { name: /Contracciones/ }).click();
  await expect(page).toHaveURL(/\/herramientas\/contracciones$/);
});

test("the descriptions survive for screen readers", async ({ page }) => {
  await page.goto("/herramientas");

  // Visually gone, still in the accessible name of the link.
  const contracciones = page.getByRole("link", {
    name: /Medí duración e intervalo/,
  });
  await expect(contracciones).toHaveCount(1);
});

test("the video tile stays hidden until real videos land", async ({ page }) => {
  await page.goto("/herramientas");
  await expect(page.getByRole("link", { name: /Galería de videos/ })).toHaveCount(0);
});

test("a tile either works or is absent: nothing says 'Pronto'", async ({ page }) => {
  await page.goto("/herramientas");
  await expect(page.getByRole("heading", { name: "Herramientas", level: 1 })).toBeVisible();
  await expect(page.getByText("Pronto")).toHaveCount(0);
  await expect(page.locator("main [aria-disabled='true']")).toHaveCount(0);
  // Nothing published yet behind these: no tile (the routes keep their empty states).
  for (const name of [/¿Puedo comer/, /¿Cuánto cuesta\?/, /Videos/]) {
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  }
  // Ejercicios is published, so its tile is there.
  await expect(page.getByRole("link", { name: /^Ejercicios/ })).toBeVisible();
});

test("the AI portrait tile is absent while the feature is off", async ({ page }) => {
  // The e2e build runs with AI_BABY_ENABLED unset, so /api/v1/ai/baby answers
  // 404 and the tile would lead nowhere. The route stays reachable by URL
  // (e2e/ai-baby.spec.ts covers it).
  await page.goto("/herramientas");
  await expect(page.getByRole("heading", { name: "Herramientas", level: 1 })).toBeVisible();
  await expect(page.locator("main a[href='/herramientas/bebe-ia']")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Así podría ser/ })).toHaveCount(0);
});
