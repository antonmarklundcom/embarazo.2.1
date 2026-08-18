import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN A2. CI runs with AUTH_SECRET / AUTH_GOOGLE_* / DATABASE_URL all
// unset, which is exactly the configuration ARCHITECTURE.md §4.2 protects:
// local-only mode. So these tests assert the half of A2 that must hold there —
// "seguir sin cuenta" is a working path and not a dead end, and nothing about
// accounts breaks a screen or sets a cookie.
//
// The signed-in half needs a real Google client and is verified against a
// configured deployment, not here.


test("/cuenta always offers a working way back into the app", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/cuenta");

  const seguir = page.getByRole("link", { name: "Seguir sin cuenta" });
  await expect(seguir).toBeVisible();

  await seguir.click();
  await expect(page).toHaveURL(/\/$/);
  // Not a dead end: the app itself is on the other side of that button.
  await expect(page.getByText("Tip de hoy")).toBeVisible();
});

test("ajustes shows the account block and stays fully usable without one", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/ajustes");

  await expect(page.getByText("Estás usando Mi Bebé sin cuenta")).toBeVisible();

  // Every local-only feature still works on the same screen.
  await expect(
    page.getByRole("button", { name: "Descargar mis datos" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Activar PIN" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Borrar todos mis datos" }),
  ).toBeVisible();
});

test("local-only mode sets no session cookie and exposes no auth endpoint", async ({
  page,
  request,
}) => {
  await completeOnboarding(page);
  await page.goto("/ajustes");

  const cookies = await page.context().cookies();
  expect(
    cookies.filter((c) => c.name.includes("authjs") || c.name.includes("next-auth")),
  ).toEqual([]);

  // Auth.js is not mounted when it cannot work — 404, not a 500.
  const res = await request.get("/api/auth/providers");
  expect(res.status()).toBe(404);
});
