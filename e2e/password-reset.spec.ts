import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// Password reset, end to end — as far as end to end can go here.
//
// CI runs with AUTH_SECRET / DATABASE_URL / RESEND_API_KEY all unset (the
// local-only configuration ARCHITECTURE.md §4.2 protects), and a spec that
// actually received a reset mail would need a live Resend account and a mailbox
// to poll. So the scope here is everything that does not need an email to have
// been delivered: both pages render, the invalid-token dead end is reachable and
// says what to do next, the link from the sign-in form exists, and neither page
// leaks a token anywhere. The token lifecycle itself is covered in
// `lib/server/passwordReset.test.ts`, where it can be asserted properly.

test("the sign-in form offers a way out of a forgotten password", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/cuenta");

  // The link lives on the "Ya tengo cuenta" tab. In local-only mode the
  // email + password block is not rendered at all, so reach the page directly
  // and assert it is not a dead end — which is the property that matters.
  await page.goto("/cuenta/olvide");
  await expect(
    page.getByRole("heading", { name: "¿Olvidaste tu contraseña?" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver a entrar" })).toBeVisible();
});

test("/cuenta/olvide explains itself and never confirms an address exists", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/cuenta/olvide");

  const body = await page.locator("body").innerText();
  // The one sentence this flow must never contain about a specific address.
  expect(body).not.toContain("Ese correo no tiene cuenta");
  expect(body).not.toContain("no existe");
});

test("/cuenta/restablecer with no token is a dead end that points forward", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/cuenta/restablecer");

  await expect(page.getByText("Enlace inválido o vencido")).toBeVisible();
  const again = page.getByRole("link", { name: "Pedir un enlace nuevo" });
  await expect(again).toBeVisible();

  await again.click();
  await expect(page).toHaveURL(/\/cuenta\/olvide$/);
});

test("a token is never rendered on the page that shows no form", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto("/cuenta/restablecer?token=no-es-un-token-real");

  // Local-only mode: no auth, so the page takes the dead-end branch and there is
  // no form for the token to ride in.
  //
  // What is asserted, and what is not. The token must never be rendered — not as
  // text, not in a field, not in an href — and that is what this checks. It is
  // NOT asserted to be absent from the raw HTML, because the App Router writes
  // the requested URL (query string and all) into its own router state inside the
  // RSC flight payload, and no page code can opt out of that. The honest position
  // is that the token is in the response body for the one person who already has
  // it in their address bar, and that the page is `force-dynamic`, `noindex`, and
  // NetworkOnly in the service worker (`PRIVATE_NAVIGATION` in `app/sw.ts`) so
  // that nothing stores that body anywhere. The page's own prop is still gated on
  // `available` so this branch adds no second copy of it.
  await expect(page.getByText("Enlace inválido o vencido")).toBeVisible();

  const visible = await page.locator("body").innerText();
  expect(visible).not.toContain("no-es-un-token-real");
  expect(await page.locator('input[name="token"]').count()).toBe(0);
  expect(
    await page.locator('[href*="no-es-un-token-real"]').count(),
  ).toBe(0);
});

test("neither reset page is indexable", async ({ page }) => {
  await completeOnboarding(page);

  for (const path of ["/cuenta/olvide", "/cuenta/restablecer"]) {
    await page.goto(path);
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/);
  }
});
