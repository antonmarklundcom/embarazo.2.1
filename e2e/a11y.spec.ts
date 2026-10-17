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
  // Soft, so one screen's finding does not hide the next screen's; the test
  // still fails at the end.
  expect.soft(
    blocking.map((v) => `${v.id} (${v.nodes.length})`),
    `${label}: serious/critical accessibility violations`,
  ).toEqual([]);
}

const PUBLIC_ROUTES = [
  "/cuenta",
  "/cuenta?ingreso=1",
  "/cuenta?ingreso=1&vuelvo=1",
  "/cuenta?cuenta=borrada",
  "/guias",
  "/guias/control-prenatal-ips-vs-privado",
  "/semana/1",
  "/semana/15",
  "/semana/40",
  "/emergencia",
  "/derechos",
  "/preguntas",
  "/borrar-cuenta",
  "/privacidad",
  "/terminos",
];

// Personal screens, audited after onboarding (2026-10-17: widened from Hoy,
// Ajustes and Herramientas to every tool and the family/progress screens).
const PERSONAL_ROUTES = [
  "/ajustes",
  "/herramientas",
  "/herramientas/carne",
  "/herramientas/checklist",
  "/herramientas/comer",
  "/herramientas/contracciones",
  "/herramientas/dental",
  "/herramientas/diario",
  "/herramientas/ejercicios",
  "/herramientas/fotos",
  "/herramientas/kegel",
  "/herramientas/nombres",
  "/herramientas/pataditas",
  "/herramientas/peso",
  "/herramientas/resumen",
  "/herramientas/sintomas",
  "/herramientas/sueno",
  "/familia",
  "/progreso",
  "/recomendados",
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

test("Hoy and every personal screen have no serious accessibility violations", async ({ page }) => {
  test.setTimeout(180_000);
  await completeOnboarding(page);
  await audit(page, "Hoy");
  for (const path of PERSONAL_ROUTES) {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    await audit(page, path);
  }
});
