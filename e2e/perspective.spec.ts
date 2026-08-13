import { test, expect } from "@playwright/test";

// BUILD-PLAN C4 (feature map #13): the same week with three entrances, opening
// on the role the user chose in onboarding (B1).

async function onboard(page: import("@playwright/test").Page, role: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: role }).click();
  const lmp = new Date(Date.now() - 140 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible();
}

test("a mamá opens on 'para vos' and can read the other two", async ({ page }) => {
  await onboard(page, "Mamá");

  const panel = page.getByRole("tabpanel", { name: "Para vos" });
  await expect(panel).toBeVisible();

  // Nothing is hidden by role: showing the partner tab to somebody is half of
  // what this block is for.
  await page.getByRole("tab", { name: "Para tu pareja" }).click();
  await expect(page.getByRole("tabpanel", { name: "Para tu pareja" })).toBeVisible();

  await page.getByRole("tab", { name: "Para la familia" }).click();
  await expect(page.getByRole("tabpanel", { name: "Para la familia" })).toBeVisible();
});

test("a papá does not have to tap past the 'para vos' tab", async ({ page }) => {
  await onboard(page, "Papá");

  await expect(page.getByRole("tab", { name: "Para tu pareja" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
