import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN D6 — "Ejercicios" ships gated exactly like the video gallery: no
// real step images exist yet (every entry's imageSrc is the shared
// placeholder), so the tile shows "Pronto" and the route itself renders its
// own empty state rather than a spinner or a 404. This is the state that
// ships today — the same posture `e2e/precios.spec.ts` takes for K10.
//
// Note: unlike some other specs in this file's family, there is no
// "with one entry published" e2e here. Publishing an entry for real would
// mean shipping a real, committed image and unlocking the tile in
// production — which the unit is explicitly not allowed to do (the tile must
// stay locked today). That path is proven instead at the unit level
// (`lib/seed/ejercicios.test.ts`, "the gate itself, proven against a
// synthetic fixture"), against a fixture that never reaches this build.

test("the tile shows Pronto and is not a link, with nothing published", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 70 });
  await page.goto("/herramientas");

  const tile = page.getByText("Ejercicios", { exact: true }).locator("..");
  await expect(tile).toBeVisible();
  await expect(page.getByText("Pronto").first()).toBeVisible();

  // Locked tiles render as a non-interactive div, never an <a>. (Kegel's own
  // tile mentions "Ejercicios" in its sr-only description, so this must match
  // the tile's own accessible name exactly, not merely contain the word.)
  await expect(page.getByRole("link", { name: "Ejercicios", exact: true })).toHaveCount(0);
});

test("direct navigation shows the real empty state, not a 404", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 70 });
  await page.goto("/herramientas/ejercicios");

  await expect(
    page.getByRole("heading", { name: "Muy pronto vamos a sumar ejercicios ilustrados" }),
  ).toBeVisible();

  // The hand-off to the one prenatal-exercise tool that IS shipped today.
  const kegelLink = page.getByRole("link", { name: /Ir a Kegel/ });
  await expect(kegelLink).toBeVisible();
  await kegelLink.click();
  await expect(page).toHaveURL(/\/herramientas\/kegel$/);
});

test("an unpublished exercise id 404s rather than rendering placeholder content", async ({
  page,
}) => {
  await completeOnboarding(page, { daysAgo: 70 });
  const response = await page.goto("/herramientas/ejercicios/caminar");
  expect(response?.status()).toBe(404);
});
