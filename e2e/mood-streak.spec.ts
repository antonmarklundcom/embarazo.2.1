import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// K9-F6 — the home check-in records on tap, and carries a gentle streak.
//
// The behaviour under test is the one the old screen did not have: before
// this, four faces on the home screen were links to /herramientas/sintomas.

test("tapping a face records the mood without leaving the screen", async ({ page }) => {
  await completeOnboarding(page);

  await page.getByRole("button", { name: "Bien", exact: true }).click();
  await expect(page.getByText("Anotado. Gracias por contarnos.")).toBeVisible();
  // Still on Hoy: the check-in is an answer now, not a link.
  await expect(page.getByText("Tip de hoy")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bien", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  // And it is really in the journal, on the tool screen that owns it.
  await page.goto("/herramientas/sintomas");
  await expect(page.getByText("Bien").first()).toBeVisible();
});

test("changing your mind corrects the day instead of adding a second one", async ({
  page,
}) => {
  await completeOnboarding(page);

  await page.getByRole("button", { name: "Muy bien", exact: true }).click();
  await expect(page.getByText("Anotado. Gracias por contarnos.")).toBeVisible();
  await page.getByRole("button", { name: "Regular", exact: true }).click();
  await expect(page.getByText("Cambiado. Gracias por contarnos.")).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Regular", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Muy bien", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");

  // One day, one entry. Two rows would be two contradictory answers in a
  // journal she reads back — and, to the streak, still only one day.
  await page.goto("/herramientas/sintomas");
  await expect(page.getByText("Muy bien")).toHaveCount(1); // the picker's own option
});

test("a single check-in is never called a streak", async ({ page }) => {
  // "Día 1 de tu racha" turns one tap into an obligation the app invented.
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Bien", exact: true }).click();
  await expect(page.getByText("Anotado. Gracias por contarnos.")).toBeVisible();
  await expect(page.getByText(/seguidos|racha|semana seguida/i)).toHaveCount(0);
});

test("a face exists for every mood the journal can store", async ({ page }) => {
  // Four faces for five moods was survivable while a tap only navigated to a
  // labelled screen. It stops being survivable when a tap is an answer.
  await completeOnboarding(page);
  for (const label of ["Muy bien", "Bien", "Regular", "Mal", "Muy mal"]) {
    await expect(
      page.getByRole("button", { name: label, exact: true }),
      label,
    ).toBeVisible();
  }
});
