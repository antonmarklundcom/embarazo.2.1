import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Email verification, end to end — as far as end to end can go here.
//
// CI runs with AUTH_SECRET / DATABASE_URL / RESEND_API_KEY all unset (the
// local-only configuration ARCHITECTURE.md §4.2 protects), so a spec that
// actually received a confirmation mail would need a live Resend account and a
// mailbox to poll. The scope here is everything that does not need a delivered
// email: the page renders, it is not indexable, it never leaks the token, and —
// the property this feature is most likely to get wrong — merely opening the
// link performs no verification, because the token is spent by the button and
// not by the page load. The token lifecycle itself is covered in
// `lib/server/emailVerification.test.ts`, where it can be asserted properly.

test("/cuenta/verificar renders and points somewhere useful", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/cuenta/verificar");

  await expect(
    page.getByRole("heading", { name: "Confirmá tu correo" }),
  ).toBeVisible();
  // Never a dead end.
  await expect(page.getByRole("link", { name: "Volver a ajustes" })).toBeVisible();
});

test("opening the link does not confirm anything on its own", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/cuenta/verificar?token=no-es-un-token-real");

  // Local-only mode: no auth, so the page takes the "cuentas no activas" branch
  // and there is no form for a token to ride in. What matters either way is that
  // the page did not report a confirmation — every mail scanner and link-preview
  // bot between Resend and the user's thumb will GET this URL, and a page that
  // consumed the token on load would hand her a dead link.
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("Tu correo está confirmado");
});

test("a token is never rendered on the page that shows no form", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/cuenta/verificar?token=no-es-un-token-real");

  // Same assertion, and the same caveat, as `password-reset.spec.ts`: the token
  // must never be rendered — not as text, not in a field, not in an href. It is
  // NOT asserted to be absent from the raw HTML, because the App Router writes
  // the requested URL into its own router state inside the RSC flight payload
  // and no page code can opt out of that. The page is `force-dynamic`, `noindex`
  // and NetworkOnly in the service worker (`PRIVATE_NAVIGATION` in `app/sw.ts`)
  // so nothing stores that body anywhere.
  const visible = await page.locator("body").innerText();
  expect(visible).not.toContain("no-es-un-token-real");
  expect(await page.locator('input[name="token"]').count()).toBe(0);
  expect(await page.locator('[href*="no-es-un-token-real"]').count()).toBe(0);
});

test("/cuenta/verificar is not indexable", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/cuenta/verificar");

  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute("content", /noindex/);
});
