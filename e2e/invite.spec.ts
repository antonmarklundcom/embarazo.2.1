import { test, expect } from "@playwright/test";

// BUILD-PLAN E3 (feature map #31). This build has no NEXT_PUBLIC_APP_URL, which
// is the state of every local and CI build and of every deployment before the
// domain exists — so the case it can exercise is the one that matters: an
// invitation to nowhere is never offered.
//
// Run with NEXT_PUBLIC_APP_URL set to exercise the other side.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim();

test("the invite card follows the app URL, not the wish to grow", async ({ page }) => {
  await page.goto("/ajustes");

  const card = page.getByText("Invitá a una amiga");
  if (APP_URL) {
    await expect(card).toBeVisible();
    await expect(page.getByRole("button", { name: "Compartir la app" })).toBeVisible();
  } else {
    await expect(card).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Compartir la app" })).toHaveCount(0);
  }
});
