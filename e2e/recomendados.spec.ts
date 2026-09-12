import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN U3 — "Recomendados" (replaces E4/"Beneficios"). Gated by
// useFlag("recomendados") (default off — CI has no database, so the real
// route always answers the default) on top of the same publishedOnly() gate
// every other seed collection uses (Z1). These mock the flags response the
// same way the flag's own consumer (lib/flags/useFlag.ts) expects it, rather
// than standing up a database.

async function mockRecomendadosFlag(page: import("@playwright/test").Page, on: boolean) {
  await page.route("**/api/v1/flags", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ recomendados: on }),
    }),
  );
}

test("flag off: the honest empty state, no recomendados", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 70 });
  await mockRecomendadosFlag(page, false);
  await page.goto("/recomendados");

  await expect(page.getByText(/Todavía no tenemos recomendados/i)).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("flag on: verified resources render and the CTA hits /api/v1/go/", async ({
  page,
}) => {
  await completeOnboarding(page, { daysAgo: 70 });
  await mockRecomendadosFlag(page, true);
  await page.goto("/recomendados");

  // "Números de emergencia" is stage 0 (shown at every stage), so it appears
  // regardless of the trimester onboarding computed from daysAgo: 70.
  const card = page.getByRole("heading", { name: "Números de emergencia, siempre a mano" });
  await expect(card).toBeVisible();

  const cta = page.getByRole("link", { name: "Abrir modo emergencia" });
  await expect(cta).toHaveAttribute("href", "/api/v1/go/rec-emergencia-numeros");
});
