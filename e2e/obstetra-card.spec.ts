import { test, expect } from "@playwright/test";

import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN C5 (feature map #14). The card is gated on
// NEXT_PUBLIC_MEDICAL_REVIEWER, which is inlined at build time — so this spec
// asserts whichever side of the gate the build under test is on. CI builds with
// it unset, which is the shipped state today and the case worth guarding: the
// app must never show prenatal advice signed by nobody.
//
// Run `NEXT_PUBLIC_MEDICAL_REVIEWER="Dra. …" npm run build && npm run test:e2e`
// to exercise the other side.

const REVIEWER = process.env.NEXT_PUBLIC_MEDICAL_REVIEWER?.trim();
const CONFIGURED = Boolean(REVIEWER) && !REVIEWER!.includes("___");

test("the obstetra card follows the reviewer, not the content", async ({ page }) => {
  await completeOnboarding(page, { daysAgo: 175 });

  const card = page.getByRole("region", { name: "De la obstetra" });

  if (CONFIGURED) {
    await expect(card).toBeVisible();
    await expect(card).toContainText(REVIEWER!);
    // Week 26 — the preeclampsia note.
    await expect(card).toContainText("preeclampsia");
  } else {
    // Not hidden with CSS, not rendered unsigned: absent.
    await expect(card).toHaveCount(0);
    await expect(page.getByText("preeclampsia")).toHaveCount(0);
  }
});
