import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// K19 — "Done when: toggle works offline; `<html lang>` follows the locale;
// 42-week content untouched."
//
// These are browser facts, not module facts. `lib/i18n/dict.test.ts` proves the
// two columns are complete and that the dictionary ships in one chunk; what it
// cannot prove is that switching the language actually repaints the nav bar
// with the plane on, which is the only condition D6 was decided for.

test("the language toggle works with the network off", async ({ page, context }) => {
  await completeOnboarding(page);

  // Install the service worker first, then cut the network — the point is a
  // toggle that works for a woman with no data left, not one that quietly
  // fetches a locale bundle.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect(page.getByRole("link", { name: "Hoy" })).toBeVisible();

  await page.goto("/ajustes");
  await context.setOffline(true);

  await page.getByRole("button", { name: "Guaraní" }).click();

  // The nav bar repaints behind the settings screen: no reload, no navigation,
  // no provider — just the profile row changing under `useLiveQuery`.
  await expect(page.getByRole("link", { name: "Ko ára" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Hoy" })).toHaveCount(0);

  // `<html lang>` follows, which is what makes a screen reader stop
  // pronouncing Guaraní through Spanish phonetics.
  await expect(page.locator("html")).toHaveAttribute("lang", "gn");

  // And it is a preference, not a session: it survives a reload, still offline.
  await page.reload();
  await expect(page.getByRole("link", { name: "Ko ára" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "gn");

  await page.getByRole("button", { name: "Castellano" }).click();
  await expect(page.getByRole("link", { name: "Hoy" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-PY");
});

test("safety copy shows Guaraní without anyone asking for it", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/emergencia");

  // No toggle was touched. D6's rule is "stacked, always" — the woman who needs
  // the Guaraní line at 3 a.m. is exactly the one who never opened Ajustes.
  await expect(
    page.getByText("Osẽramo ndehegui tuguy, oimeraẽva árape"),
  ).toBeVisible();
  // …stacked *under* the Spanish, not instead of it.
  await expect(
    page.getByText("Sangrado vaginal, en cualquier momento del embarazo"),
  ).toBeVisible();
  // Marked up as Guaraní, so assistive tech switches pronunciation.
  await expect(page.locator('[lang="gn"]').first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-PY");
});

test("the weekly content stays in Spanish in Guaraní mode", async ({ page }) => {
  // The honest half of D6: the toggle moves ~100 core strings, not the 42 weeks
  // of medical content, and Ajustes says so. If a later batch starts
  // translating articles by hand without a funded reviewer, this fails — which
  // is the point. A half-translated medical corpus is worse than an
  // untranslated one, because it looks finished.
  await completeOnboarding(page);
  await page.goto("/ajustes");
  await page.getByRole("button", { name: "Guaraní" }).click();
  await expect(page.getByRole("link", { name: "Ko ára" })).toBeVisible();

  await page.goto("/semana/15");
  await expect(page.getByText("Qué pasa esta semana")).toBeVisible();
});
