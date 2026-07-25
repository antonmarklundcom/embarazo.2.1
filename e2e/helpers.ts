import { expect, type Page } from "@playwright/test";

// Shared onboarding driver. Lived as a copy-pasted function in four specs
// before BUILD-PLAN B1/B2/B3 reshaped the flow and every copy needed the same
// edit — which is the argument for it living here.
//
// Flow: mode → role → date → nickname → department.

export interface OnboardingOptions {
  /** Defaults to a pregnancy around week 11. */
  weeksPregnant?: number;
  /** Defaults to "Soy la mamá". */
  roleLabel?: string;
  /** Optional baby nickname; skipped when omitted. */
  nickname?: string;
}

export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export function isoDaysAhead(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

/** Completes onboarding in "embarazada" mode and lands on the home screen. */
export async function completeOnboarding(
  page: Page,
  options: OnboardingOptions = {},
): Promise<void> {
  const { weeksPregnant = 10, roleLabel = "Soy la mamá", nickname } = options;

  await page.goto("/");
  await page.getByRole("button", { name: "Estoy embarazada" }).click();
  await page.getByRole("button", { name: roleLabel }).click();

  await page.locator("#lmp").fill(isoDaysAgo(weeksPregnant * 7));
  await page.getByRole("button", { name: "Continuar" }).click();

  if (nickname) await page.locator("#nickname").fill(nickname);
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.locator("#dep").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Empezar" }).click();

  await expect(page.getByText("Tip de hoy")).toBeVisible();
}
