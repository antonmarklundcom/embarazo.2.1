import { test, expect } from "@playwright/test";
import { completeOnboarding } from "./helpers/onboarding";

// Local-data feature suites explicitly opt out through Playwright's preview
// environment. Production account entry is tested in account-entry.spec.ts.
test("/cuenta offers public reading and no anonymous personal-tracking entry", async ({ page }) => {
  await page.goto("/cuenta");
  await expect(page.getByRole("link", { name: "Seguir sin cuenta" })).toHaveCount(0);
  const guides = page.getByRole("link", { name: "Ver consejos", exact: true });
  await expect(guides).toBeVisible();
  await guides.click();
  await expect(page).toHaveURL(/\/guias$/);
});

test("explicit local test preview keeps data tools available without a configured provider", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/ajustes");
  await expect(page.getByRole("button", { name: "Descargar mis datos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activar PIN" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Borrar datos de este teléfono" })).toBeVisible();
});

test("unconfigured local test preview sets no session cookie and exposes no auth endpoint", async ({ page, request }) => {
  await completeOnboarding(page);
  const cookies = await page.context().cookies();
  expect(cookies.filter((cookie) => cookie.name.includes("authjs") || cookie.name.includes("next-auth"))).toEqual([]);
  expect((await request.get("/api/auth/providers")).status()).toBe(404);
});


test("account deletion confirmation remains public when tracking requires login",async({page,context})=>{
  await context.route("**/api/v1/auth-status",route=>route.fulfill({json:{signedIn:false,accountId:null,accountRequired:true,providers:[]}}));
  await page.goto("/cuenta?cuenta=borrada&limpieza=pendiente");
  await expect(page.getByRole("heading",{name:"Tu cuenta fue borrada"})).toBeVisible();
  await expect(page.getByText(/no pudimos confirmar la limpieza/)).toBeVisible();
  await expect(page.getByRole("link",{name:"Leer las guías"})).toBeVisible();
  await page.goto("/ajustes?cuenta=borrada");
  await expect(page).toHaveURL(/\/cuenta\?cuenta=borrada/);
  await expect(page.getByRole("heading",{name:"Tu cuenta fue borrada"})).toBeVisible();
});
