import { test, expect, type Page } from "@playwright/test";

import { gotoPrecached, waitForPrecache } from "./helpers/offline";
import { completeOnboarding } from "./helpers/onboarding";

// "Para conversar": question cards for her and whoever accompanies her. One
// card at a time, a theme filter, a "Ya lo hablamos" mark kept on the device,
// and a WhatsApp link carrying the question.

const question = (page: Page) => page.locator("#conversar-pregunta");

test("the tile in the toolbox opens the cards", async ({ page }) => {
  await page.goto("/herramientas");
  const tile = page.locator('a[href="/herramientas/conversar"]');
  await expect(tile).toHaveCount(1);
  await expect(tile).toContainText("Para conversar");
  await tile.click();
  await expect(page).toHaveURL(/\/herramientas\/conversar$/);
  await expect(page.getByRole("heading", { name: "Para conversar", level: 1 })).toBeVisible();
  await expect(page.getByText("1 de 36")).toBeVisible();
});

test("Siguiente and Anterior move one card at a time", async ({ page }) => {
  await page.goto("/herramientas/conversar");
  const first = await question(page).textContent();
  await expect(page.getByRole("button", { name: "Anterior" })).toBeDisabled();

  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("2 de 36")).toBeVisible();
  await expect(question(page)).not.toHaveText(first!);

  await page.getByRole("button", { name: "Anterior" }).click();
  await expect(page.getByText("1 de 36")).toBeVisible();
  await expect(question(page)).toHaveText(first!);
});

test("a theme narrows the deck to its six cards", async ({ page }) => {
  await page.goto("/herramientas/conversar");
  const chip = page.getByRole("button", { name: "Plata y trabajo" });
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("1 de 6")).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await expect(question(page)).toHaveAttribute("data-card-id", /^plata-/);
    await page.getByRole("button", { name: "Siguiente" }).click();
  }
  await expect(page.getByText("6 de 6")).toBeVisible();
  await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();

  await page.getByRole("button", { name: "Todas" }).click();
  await expect(page.getByText("1 de 36")).toBeVisible();
});

test("«Ya lo hablamos» survives a reload and stays on the device", async ({ page }) => {
  await page.goto("/herramientas/conversar");
  await page.getByRole("button", { name: "Siguiente" }).click();
  const id = await question(page).getAttribute("data-card-id");
  const mark = page.getByRole("button", { name: "Ya lo hablamos" });
  await expect(mark).toHaveAttribute("aria-pressed", "false");
  await mark.click();
  await expect(mark).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("1 hablada")).toBeVisible();

  expect(
    await page.evaluate(() => localStorage.getItem("mibebe.conversar.talked")),
  ).toBe(JSON.stringify([id]));

  await page.reload();
  await expect(page.getByText("1 hablada")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(question(page)).toHaveAttribute("data-card-id", id!);
  await expect(page.getByRole("button", { name: "Ya lo hablamos" })).toHaveAttribute("aria-pressed", "true");
});

test("the WhatsApp link carries the question on screen", async ({ page }) => {
  await page.goto("/herramientas/conversar");
  await page.getByRole("button", { name: "Visitas", exact: true }).click();
  const text = (await question(page).textContent())!;
  const link = page.getByRole("link", { name: "Mandar por WhatsApp" });
  const href = (await link.getAttribute("href"))!;
  expect(href.startsWith("https://wa.me/?text=")).toBe(true);
  expect(decodeURIComponent(href.slice("https://wa.me/?text=".length))).toBe(text);
});

test("no horizontal scroll at 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/herramientas/conversar");
  await expect(question(page)).toBeVisible();
  for (const theme of [null, "Ilusiones y miedos"]) {
    if (theme) await page.getByRole("button", { name: theme }).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

// Same shape as the precached tool pages in offline.spec.ts: the gate admits a
// device offline only when its account was verified online.
test("the cards open offline after one online visit", async ({ page, context }) => {
  test.setTimeout(120_000);
  await completeOnboarding(page, { daysAgo: 70 });
  await context.route("**/api/v1/auth-status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        providers: ["google"],
        credentialsAvailable: false,
        accountRequired: true,
        signedIn: true,
        accountId: "offline-owner",
      }),
    }),
  );
  await page.goto("/herramientas/conversar");
  await expect(question(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("mibebe.auth.offline.v1"))).not.toBeNull();
  await waitForPrecache(page, ["/herramientas/conversar"]);

  await context.route("**/api/v1/auth-status", (route) => route.abort());
  await context.setOffline(true);
  await gotoPrecached(page, "/herramientas/conversar");
  await expect(page.locator("main h1").first()).toHaveText("Para conversar");
  await expect(question(page)).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByText("2 de 36")).toBeVisible();
});
