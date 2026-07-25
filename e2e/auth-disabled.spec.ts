import { test, expect } from "@playwright/test";
import { completeOnboarding } from "./helpers";

// BUILD-PLAN A2. With no auth configured — which is how this build runs, and
// how any local build runs — the app must stay in local-only mode: no broken
// sign-in button, no error page, nothing pushing the user toward an account
// that does not exist here.

test("auth status reports accounts as unavailable", async ({ request }) => {
  const res = await request.get("/api/v1/auth/status");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ enabled: false, providers: [] });
});

test("/entrar explains instead of offering a broken button", async ({ page }) => {
  await page.goto("/entrar");

  await expect(
    page.getByText("Las cuentas todavía no están disponibles"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Continuar con/ })).toHaveCount(0);

  // Local-only is presented as a supported way to use the app, not a fallback.
  await expect(page.getByRole("link", { name: "Seguir sin cuenta" })).toBeVisible();
});

test("Ajustes shows no account section when accounts are unavailable", async ({
  page,
}) => {
  await completeOnboarding(page);

  await page.goto("/ajustes");
  await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu cuenta" })).toHaveCount(0);
});

test("the session endpoint answers cleanly rather than erroring", async ({
  request,
}) => {
  // Regression guard: without trustHost, Auth.js rejects every request with
  // UntrustedHost and this endpoint 500s on each page load.
  const res = await request.get("/api/auth/session");
  expect(res.status()).toBe(200);
});
