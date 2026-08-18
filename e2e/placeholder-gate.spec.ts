import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN Z1: no invented business, sponsor or event may reach a user.
// The unit tests in lib/seed/gate.test.ts prove the data is filtered; these
// prove the screens that render it behave correctly when it is.


// The invented seed data is recognisable by the "(placeholder)" marker and the
// +595 981 000 0xx number range. Neither may appear anywhere in the rendered
// page — including inside wa.me links.
//
// Match the parenthesised marker specifically: a bare "placeholder" also
// matches legitimate HTML like the search input's placeholder attribute.
async function expectNoPlaceholderContent(page: import("@playwright/test").Page) {
  const html = await page.content();
  expect(html.toLowerCase()).not.toContain("(placeholder)");
  expect(html).not.toMatch(/595981000\d{3}/);
}

test("directorio shows an honest empty state, not invented businesses", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/directorio");

  await expect(
    page.getByText(/Todavía no tenemos lugares cargados/i),
  ).toBeVisible();
  await expect(page.getByText(/Estamos armando el directorio/i)).toBeVisible();
  await expectNoPlaceholderContent(page);
});

test("eventos shows an honest empty state, not invented charlas", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/eventos");

  await expect(page.getByText(/Todavía no hay eventos cargados/i)).toBeVisible();
  // The department filter is pointless with an empty catalogue and is hidden.
  await expect(page.getByLabel("Departamento")).toHaveCount(0);
  await expectNoPlaceholderContent(page);
});

test("home screen renders no sponsored placements", async ({ page }) => {
  await completeOnboarding(page);
  await expect(page.getByText("Patrocinado")).toHaveCount(0);
  await expectNoPlaceholderContent(page);
});
