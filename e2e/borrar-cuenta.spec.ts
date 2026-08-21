import { test, expect } from "@playwright/test";

// `docs/ANDROID-LAUNCH.md` §3.3 — the public deletion page Play requires.
//
// Every assertion here is a property a Play reviewer checks, and each one is a
// way the page could quietly stop meeting the requirement: it must load with
// **no app state at all** (no onboarding, no account, no session), it must not
// be an unauthenticated deletion endpoint, and it must actually name a way to
// reach a human.

test("loads for a stranger with no onboarding and no account", async ({ page }) => {
  // No `completeOnboarding` on purpose. Someone arriving from a store listing
  // has no profile, and a page that redirected them into the app's first-run
  // gate would fail the requirement while looking fine to us.
  await page.goto("/borrar-cuenta");

  await expect(
    page.getByRole("heading", { name: "Borrar tu cuenta y tus datos" }),
  ).toBeVisible();
  await expect(page.getByText(/Ajustes/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Qué se borra" })).toBeVisible();
});

test("is not an unauthenticated deletion endpoint", async ({ page }) => {
  await page.goto("/borrar-cuenta");

  // The obvious build is a box that takes an email and deletes the account.
  // That is a way for anyone to erase somebody else's pregnancy by typing
  // their address, and no rate limit fixes it — the request is
  // indistinguishable from the real one. The page describes a human process
  // instead, and this asserts nobody quietly added the form later.
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.locator("input")).toHaveCount(0);
  await expect(page.locator("textarea")).toHaveCount(0);
});

test("names a way to reach a human", async ({ page }) => {
  await page.goto("/borrar-cuenta");

  // At least one contact link. `lib/launchChecks.ts` refuses to build a
  // deployment where neither channel is configured, so on a real deploy this
  // is guaranteed; here it guards the rendering that surfaces it.
  const contacts = page.locator('a[href^="mailto:"], a[href^="https://wa.me/"]');
  await expect(contacts.first()).toBeVisible();
});

test("carries no bottom nav — it is not the app", async ({ page }) => {
  await page.goto("/borrar-cuenta");

  // Outside the (app) route group, like /conoce. A reviewer or a woman on a
  // borrowed phone should not be handed the app's chrome, and the SOS pill in
  // particular belongs to a signed-in pregnancy, not to a legal page.
  await expect(page.getByRole("navigation", { name: /Navegación/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "SOS" })).toHaveCount(0);
});

test("is linked from the privacy policy", async ({ page }) => {
  // A page nobody can reach is a page Play cannot verify either. The store
  // listing links it directly; this is the in-product path to it.
  await page.goto("/privacidad");
  const link = page.getByRole("link", { name: "borrar tu cuenta" });
  await expect(link).toBeVisible();
  await link.click();
  await expect(
    page.getByRole("heading", { name: "Borrar tu cuenta y tus datos" }),
  ).toBeVisible();
});
