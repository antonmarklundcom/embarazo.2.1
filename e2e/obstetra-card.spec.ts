import { test, expect } from "@playwright/test";

import approvals from "../lib/seed/approvals.json";
import reviewers from "../lib/seed/reviewers.json";
import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN C5 (feature map #14), F22 (2026-10). The card renders a week's
// note only with a reviewer's approval of that week's exact text in
// lib/seed/approvals.json, signed by that reviewer. NEXT_PUBLIC_MEDICAL_REVIEWER
// no longer unlocks it: build with the variable set to a real-looking name
// (`NEXT_PUBLIC_MEDICAL_REVIEWER="Dra. Prueba" npm run build`) and this spec
// must still pass — the case worth guarding is a name on prenatal advice that
// nobody signed.
//
// The spec reads the shipped registry rather than assuming it is empty, so it
// keeps passing the day week 26 is really approved (then the card must show,
// signed by its approver). It checks presence by id, not the hash: a stale
// approval is reported by `npm run validate:content`.

const approval = (approvals as { contentId: string; reviewerId: string }[]).find(
  (entry) => entry.contentId === "obstetra:26",
);
const approver = (reviewers as { id: string; name: string }[]).find(
  (entry) => entry.id === approval?.reviewerId,
);

test("the obstetra card follows the week's approval, not a reviewer setting", async ({
  page,
}) => {
  await completeOnboarding(page, { daysAgo: 175 });

  const card = page.getByRole("region", { name: "De la obstetra" });

  if (approval && approver) {
    await expect(card).toBeVisible();
    await expect(card).toContainText(approver.name);
    // Week 26 — the preeclampsia note.
    await expect(card).toContainText("preeclampsia");
  } else {
    // Not hidden with CSS, not rendered unsigned: absent.
    await expect(card).toHaveCount(0);
    await expect(page.getByText("preeclampsia")).toHaveCount(0);
  }

  // Whatever the build's variable says, no screen claims a review the registry
  // does not record.
  const configured = process.env.NEXT_PUBLIC_MEDICAL_REVIEWER?.trim();
  if (configured && !approver) {
    await expect(page.getByText(configured)).toHaveCount(0);
  }
});
