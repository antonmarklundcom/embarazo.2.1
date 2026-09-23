import { expect, test } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Semana nueva — her week turns over on her own weekday (lib/newWeek.ts).

test("the new-week card greets her on the day her week turns over, and stays closed once closed", async ({
  page,
}) => {
  // 70 days since the FUM: 10+0, so today is the first day of week 11.
  await completeOnboarding(page, { daysAgo: 70 });

  const card = page.getByRole("region", { name: "¡Hoy empezás la semana 11!" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Cumpliste 10 semanas");
  await expect(card.getByRole("link", { name: "Ver mi semana 11" })).toHaveAttribute(
    "href",
    "/semana/11",
  );

  await card.getByRole("button", { name: "Cerrar" }).click();
  await expect(card).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await expect(page.getByRole("region", { name: /semana 11/ })).toHaveCount(0);
});

test("mid-week there is no new-week card", async ({ page }) => {
  // 74 days: 10+4, well past the three-day window.
  await completeOnboarding(page, { daysAgo: 74 });
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await expect(page.getByText("Semana nueva", { exact: true })).toHaveCount(0);
});
