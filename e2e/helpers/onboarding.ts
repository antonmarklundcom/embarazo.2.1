import { expect, type Page } from "@playwright/test";

// BUILD-PLAN K1 — one onboarding walk-through, shared by every spec that needs
// an onboarded app to test something else.
//
// It lived inline in fourteen spec files before K1 added steps to the flow, at
// which point fourteen copies had to learn the same three new clicks. The flow
// is the app's front door and it will change again; it belongs in one place.
//
// **CI runs with no auth configured** (no AUTH_SECRET, no AUTH_GOOGLE_*, no
// DATABASE_URL) — the local-only mode ARCHITECTURE.md §4.2 protects. So the
// account step here always renders its "por ahora, sin cuenta" face and the
// walk-through takes "Seguir sin cuenta". The signed-in half of the flow needs
// a real Google client and is verified against a configured deployment.

export interface OnboardOptions {
  mode?: "embarazada" | "planeando";
  /** The role button's label, e.g. "Mamá" (default) or "Papá". */
  role?: string;
  /** How many days ago the LMP was. Ignored unless `method` is "lmp". */
  daysAgo?: number;
  method?: "lmp" | "ecografia" | "fiv";
  /** Typed into the baby-name step. Left blank when absent — it is optional. */
  babyName?: string;
  /**
   * K2: a signed-in companion lands on the pregnancy they are accompanying,
   * not on "Hoy", so the default readiness check does not apply to them. Set
   * false and assert the companion screen instead.
   */
  landsOnHome?: boolean;
}

export async function completeOnboarding(
  page: Page,
  options: OnboardOptions = {},
): Promise<void> {
  const {
    mode = "embarazada",
    role = "Mamá",
    daysAgo = 70,
    method = "lmp",
    babyName,
    landsOnHome = true,
  } = options;

  await page.goto("/");
  await page
    .getByRole("button", {
      name: mode === "embarazada" ? "Estoy embarazada" : "Estoy planeando / buscando",
    })
    .click();
  await page.getByRole("button", { name: role }).click();

  if (mode === "embarazada") {
    if (method !== "lmp") await page.locator("#method").selectOption(method);
    if (method === "lmp") {
      await page
        .locator("#lmp")
        .fill(new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10));
    } else if (method === "ecografia") {
      await page
        .locator("#due")
        .fill(new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10));
    } else {
      await page
        .locator("#fivDate")
        .fill(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    }
    await page.getByRole("button", { name: "Continuar" }).click();
  }

  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuar" }).click();

  // The account step. Secondary, but never hidden.
  await page.getByRole("button", { name: "Seguir sin cuenta" }).click();

  if (mode === "embarazada") {
    if (babyName) await page.locator("#babyName").fill(babyName);
    await page.getByRole("button", { name: "Empezar" }).click();
    if (landsOnHome) await expect(page.getByText("Tip de hoy")).toBeVisible();
    else {
      await expect(
        page.getByRole("heading", { name: "Bienvenida a Mi Bebé" }),
      ).toHaveCount(0);
    }
  }
}
