import { test, expect } from "@playwright/test";

// BUILD-PLAN C5 (feature map #14). The card is gated on
// NEXT_PUBLIC_MEDICAL_REVIEWER, which is inlined at build time — so this spec
// asserts whichever side of the gate the build under test is on. CI builds with
// it unset, which is the shipped state today and the case worth guarding: the
// app must never show prenatal advice signed by nobody.
//
// Run `NEXT_PUBLIC_MEDICAL_REVIEWER="Dra. …" npm run build && npm run test:e2e`
// to exercise the other side.

const REVIEWER = process.env.NEXT_PUBLIC_MEDICAL_REVIEWER?.trim();
const CONFIGURED = Boolean(REVIEWER) && !REVIEWER!.includes("___");

test("the obstetra card follows the reviewer, not the content", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();
  const lmp = new Date(Date.now() - 175 * 86400000).toISOString().slice(0, 10);
  await page.locator("#lmp").fill(lmp);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible();

  const card = page.getByRole("region", { name: "De la obstetra" });

  if (CONFIGURED) {
    await expect(card).toBeVisible();
    await expect(card).toContainText(REVIEWER!);
    // Week 26 — the preeclampsia note.
    await expect(card).toContainText("preeclampsia");
  } else {
    // Not hidden with CSS, not rendered unsigned: absent.
    await expect(card).toHaveCount(0);
    await expect(page.getByText("preeclampsia")).toHaveCount(0);
  }
});
