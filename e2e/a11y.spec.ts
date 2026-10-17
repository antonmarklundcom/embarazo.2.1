import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Automated accessibility check (WCAG 2.x A/AA rules in axe-core) on the
// screens a new or returning user actually meets. It fails on "serious" and
// "critical" findings; "moderate"/"minor" ones are printed so they stay
// visible without blocking. axe catches roughly a third of real problems —
// this complements the keyboard, target-size and contrast checks elsewhere in
// e2e/, it does not replace a person using a screen reader.

const BLOCKING = new Set(["serious", "critical"]);

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter((v) => BLOCKING.has(v.impact ?? ""));
  for (const v of results.violations) {
    console.log(
      `[a11y ${label}] ${v.impact} ${v.id}: ${v.help} — ${v.nodes.length} node(s): ` +
        v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | "),
    );
  }
  expect(
    blocking.map((v) => `${v.id} (${v.nodes.length})`),
    `${label}: serious/critical accessibility violations`,
  ).toEqual([]);
}

const PUBLIC_ROUTES = [
  "/cuenta",
  "/cuenta?ingreso=1",
  "/cuenta?ingreso=1&vuelvo=1",
  "/guias",
  "/semana/15",
  "/emergencia",
  "/borrar-cuenta",
  "/privacidad",
];

for (const path of PUBLIC_ROUTES) {
  test(`public page ${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    await audit(page, path);
  });
}

test("the first onboarding questions have no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Estoy embarazada/ })).toBeVisible();
  await audit(page, "onboarding start");
  await page.getByRole("button", { name: /^Estoy embarazada/ }).click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await audit(page, "onboarding role");
});

test("Hoy, Ajustes and Herramientas have no serious accessibility violations", async ({ page }) => {
  await completeOnboarding(page);
  await audit(page, "Hoy");
  for (const path of ["/ajustes", "/herramientas"]) {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    await audit(page, path);
  }
});
