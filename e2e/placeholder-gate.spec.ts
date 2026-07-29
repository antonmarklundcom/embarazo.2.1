import { test, expect } from "@playwright/test";
import { completeOnboarding } from "./helpers";

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

// BUILD-PLAN D4: the checklist has its own tab, and the nav resolves the
// active tab by longest match — a plain prefix check would light up both
// Herramientas and Checklist on /herramientas/checklist.
test("checklist is its own nav tab and is the only active one there", async ({
  page,
}) => {
  await completeOnboarding(page);

  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(nav.getByRole("link", { name: "Checklist" })).toBeVisible();

  await nav.getByRole("link", { name: "Checklist" }).click();
  await expect(page).toHaveURL(/\/herramientas\/checklist/);

  await expect(nav.locator("[aria-current='page']")).toHaveCount(1);
  await expect(nav.locator("[aria-current='page']")).toHaveText("Checklist");
});

// BUILD-PLAN D1: the tools grid, and roles that do not own the pregnancy do
// not get tools that record the mother's own data.
test("a partner does not see the mother's personal tools", async ({ page }) => {
  await completeOnboarding(page, { roleLabel: "Soy el papá" });
  await page.goto("/herramientas");

  await expect(page.getByRole("link", { name: "Emergencia" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Guías" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Diario de fotos" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Carné perinatal" })).toHaveCount(0);
});
