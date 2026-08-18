import { test, expect, type Page } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN K1 (docs/FABLE-PLAN-2026-08.md §3) — account-first onboarding.
//
// The flow is mode → role → fecha → departamento → **cuenta** → nombre del
// bebé → invitación. Each test gets a fresh browser context (isolated
// IndexedDB/localStorage), so no cleanup is needed between runs.
//
// CI has no AUTH_SECRET, no Google client and no database, so the account step
// renders its "por ahora, sin cuenta" face here. That is the *local-only* path
// (ARCHITECTURE.md §4.2) and it is half of what K1's "Done when" asks for; the
// other half — that the answers survive leaving the flow and coming back, which
// is what an OAuth redirect does to it — is exercised below without needing a
// real provider, because the mechanism is the saved draft either way.

const DRAFT_KEY = "mibebe:onboarding:v1";

async function readDraft(page: Page) {
  const raw = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    DRAFT_KEY,
  );
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

test("embarazada mode via last menstrual period date", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bienvenida a Mi Bebé" })).toBeVisible();

  await completeOnboarding(page, { babyName: "Silvia" });

  // The nickname collected on its own step reaches the profile the app reads.
  await page.goto("/ajustes");
  await expect(page.locator('input[placeholder="Ej: Silvia"]')).toHaveValue(
    "Silvia",
  );
});

test("embarazada mode via due date (ecografía method)", async ({ page }) => {
  await completeOnboarding(page, { method: "ecografia" });
});

test("embarazada mode via FIV embryo transfer date", async ({ page }) => {
  await completeOnboarding(page, { method: "fiv" });
});

test("planeando mode skips the pregnancy-only steps", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy planeando / buscando" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();

  // No LMP/due-date step for this mode — straight to department.
  await expect(page.locator("#dep")).toBeVisible();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuar" }).click();

  // The account step exists in this mode too; the baby-name and invite steps
  // do not, so "seguir sin cuenta" is the last thing the flow asks.
  await page.getByRole("button", { name: "Seguir sin cuenta" }).click();

  await expect(
    page.getByRole("heading", { name: "Estás planeando tu embarazo" }),
  ).toBeVisible();
});

test("the old 'no te pedimos cuenta' promise is gone from the first screen", async ({
  page,
}) => {
  await page.goto("/");
  // K1 deletes it; the app now asks for an account as its main path, and a
  // screen that says otherwise while doing so is the contradiction the Fable
  // review found.
  await expect(page.getByText(/No te pedimos cuenta/i)).toHaveCount(0);
  await expect(page.getByText(/sin cuenta/i).first()).toBeVisible();
});

test("the account step is reached, and offers a way past it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Mamá" }).click();
  await page
    .locator("#lmp")
    .fill(new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: /sin cuenta|Guardá tu embarazo/ })).toBeVisible();
  // Never a dead end, in either configuration.
  await expect(page.getByRole("button", { name: "Seguir sin cuenta" })).toBeVisible();
});

test("leaving the flow at the account step and coming back resumes it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: "Papá" }).click();
  await page
    .locator("#lmp")
    .fill(new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator("#dep").selectOption({ index: 1 });
  await page.locator("#city").fill("Luque");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: "Seguir sin cuenta" })).toBeVisible();

  // Everything answered so far is durable before the account step can send the
  // browser anywhere: this is what makes an abandoned sign-in survivable.
  const draft = await readDraft(page);
  expect(draft).toMatchObject({
    step: "cuenta",
    role: "papa",
    city: "Luque",
    profileSaved: true,
  });

  // Stand in for the OAuth round trip: a full navigation away and back, which
  // is exactly what Google does to this page. Nothing in React survives it.
  await page.goto("/ajustes");
  await page.goto("/");

  // Resumed on the account step, not back at "¿Cómo querés usar Mi Bebé?".
  await expect(page.getByRole("button", { name: "Seguir sin cuenta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Estoy embarazada" })).toHaveCount(0);

  await page.getByRole("button", { name: "Seguir sin cuenta" }).click();
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByText("Tip de hoy")).toBeVisible();

  // Finishing forgets the draft; the next open is the app, not the flow.
  expect(await readDraft(page)).toBeNull();
  await page.reload();
  await expect(page.getByText("Tip de hoy")).toBeVisible();
});

test("abandoning at the account step still leaves a working app underneath", async ({
  page,
}) => {
  await completeOnboarding(page);
  // Sanity: the finished flow leaves the real app, reachable and offline-ready,
  // with no account anywhere in it.
  await page.goto("/herramientas");
  await expect(page.getByRole("heading", { name: "Herramientas" })).toBeVisible();

  const cookies = await page.context().cookies();
  expect(
    cookies.filter((c) => c.name.includes("authjs") || c.name.includes("next-auth")),
  ).toEqual([]);
});

// K1's /api/v1/auth-status is what tells the client-side onboarding whether an
// account is possible here. Its handler imports next-auth, which does not load
// under vitest, so its boundary behaviour is asserted against a real build.
test("/api/v1/auth-status answers honestly and takes no parameters", async ({
  request,
}) => {
  const res = await request.get("/api/v1/auth-status");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ providers: [], signedIn: false });
  expect(res.headers()["cache-control"]).toBe("no-store");

  for (const param of ["week=24", "department=capital", "email=a@b.c"]) {
    const rejected = await request.get(`/api/v1/auth-status?${param}`);
    expect(rejected.status(), `${param} must be rejected`).toBe(400);
  }
});
