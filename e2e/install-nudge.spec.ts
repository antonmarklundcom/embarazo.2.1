import { test, expect, devices } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Night run item 2 — the compact install prompt. Phones only, so this spec
// runs as an Android phone; the desktop project never sees the prompt.

test.use({
  userAgent: devices["Pixel 7"].userAgent,
  viewport: devices["Pixel 7"].viewport,
  hasTouch: true,
  isMobile: true,
});

type Sent = { metric: string; key: string };

test("a public week page offers it until «Ahora no», then never again", async ({ page }) => {
  const sent: Sent[] = [];
  await page.route("**/api/v1/stats/funnel", async (route) => {
    sent.push(JSON.parse(route.request().postData() ?? "{}") as Sent);
    await route.fulfill({ status: 204, body: "" });
  });
  await page.goto("/semana/20");
  const nudge = page.locator('[data-install-nudge="public"]');
  await expect(nudge).toBeVisible();
  await expect(nudge).toContainText("En Chrome: menú ⋮ → Instalar app.");
  // No Play listing configured in this build: no Play link.
  await expect(nudge.getByRole("link", { name: "Disponible en Google Play" })).toHaveCount(0);
  await expect.poll(() => sent.filter((e) => e.metric === "install")).toEqual([
    { metric: "install", key: "prompt" },
  ]);

  await nudge.getByRole("button", { name: "Ahora no" }).click();
  await expect(nudge).toHaveCount(0);
  await page.goto("/semana/21");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.locator("[data-install-nudge]")).toHaveCount(0);
});

test("after onboarding it shows once on Hoy and once on the first tool", async ({ page }) => {
  await completeOnboarding(page);
  await expect(page.locator('[data-install-nudge="onboarded"]')).toBeVisible();
  await page.reload();
  await expect(page.getByText("Un momento para vos")).toBeVisible();
  await expect(page.locator('[data-install-nudge="onboarded"]')).toHaveCount(0);

  await page.goto("/herramientas/contracciones");
  await expect(page.locator('[data-install-nudge="first-tool"]')).toBeVisible();
  await page.goto("/herramientas/pataditas");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.locator("[data-install-nudge]")).toHaveCount(0);
});
