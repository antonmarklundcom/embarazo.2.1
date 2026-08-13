import { test, expect } from "@playwright/test";

// BUILD-PLAN C2 (feature map #11): the home screen leads with one concrete
// sentence about what is happening this week. A 70-day LMP puts the user in
// week 11, whose line is about the baby opening and closing its hands.

test("the home screen shows the line for the current week", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();

  const lmp = new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();

  const block = page.getByRole("region", { name: "Esta semana", exact: true });
  await expect(block).toBeVisible();
  await expect(block).toContainText("Abre y cierra las manitos");

  // It sits above the tip, not buried below it: this is the two-second
  // answer, and C1 marked this slot for it.
  const blockBox = await block.boundingBox();
  const tipBox = await page.getByText("Tip de hoy").boundingBox();
  expect(blockBox!.y).toBeLessThan(tipBox!.y);
});
