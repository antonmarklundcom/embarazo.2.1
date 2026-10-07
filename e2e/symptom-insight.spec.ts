import { test, expect } from "@playwright/test";

import approvals from "../lib/seed/approvals.json";
import reviewers from "../lib/seed/reviewers.json";
import { completeOnboarding } from "./helpers/onboarding";

// BUILD-PLAN K9 / F3 — symptom insight; F22 (2026-10).
//
// The card uses a sentence template only with a reviewer's approval of that
// template's exact text in lib/seed/approvals.json, and names that reviewer.
// NEXT_PUBLIC_MEDICAL_REVIEWER no longer unlocks it: a build with the variable
// set must pass this spec too. **The case worth guarding**: the app must never
// volunteer an interpretation of somebody's symptoms with nobody's name on the
// phrasing.
//
// The seeded fortnight (nausea on the low-mood days) produces the "mood"
// finding, so the card shows exactly when `insight:mood` is approved.

const insightApprovals = (approvals as { contentId: string; reviewerId: string }[]).filter(
  (entry) => entry.contentId.startsWith("insight:"),
);
const moodApproval = insightApprovals.find((entry) => entry.contentId === "insight:mood");
const moodApprover = (reviewers as { id: string; name: string }[]).find(
  (entry) => entry.id === moodApproval?.reviewerId,
);

/** Fourteen days of check-ins: nausea on every bad-mood day and almost nowhere else. */
async function seedFourteenDays(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const request = indexedDB.open("mibebe");
    const database: IDBDatabase = await new Promise((res, rej) => {
      request.onsuccess = () => res(request.result);
      request.onerror = () => rej(request.error);
    });

    const tx = database.transaction("journalEntries", "readwrite");
    const store = tx.objectStore("journalEntries");
    const day = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      d.setHours(10, 0, 0, 0);
      return d.getTime();
    };

    for (let i = 0; i < 14; i += 1) {
      const bad = i < 6;
      store.add({
        week: 20,
        mood: bad ? "mal" : "bien",
        symptoms: bad ? ["Náuseas"] : [],
        note: "",
        createdAt: day(i),
        uid: `e2e-${i}`,
        updatedAt: day(i),
        deletedAt: null,
        dirty: 1,
      });
    }

    await new Promise((res) => {
      tx.oncomplete = () => res(null);
    });
  });
}

test("the insight card follows the template's approval, not the data or a setting", async ({
  page,
}) => {
  await completeOnboarding(page, { daysAgo: 140 });
  await page.goto("/herramientas/sintomas");
  await seedFourteenDays(page);
  await page.reload();

  const card = page.getByRole("region", { name: "Lo que venís anotando" });

  if (moodApproval && moodApprover) {
    await expect(card).toBeVisible();
    await expect(card).toContainText("náuseas");
    await expect(card).toContainText(moodApprover.name);
    // Never a diagnosis, and never a claim about cause.
    await expect(card).toContainText("No es un diagnóstico");
    await expect(card).not.toContainText("porque");
  } else if (insightApprovals.length === 0) {
    // Not hidden with CSS, not rendered unsigned: absent. The app does not
    // volunteer an interpretation of somebody's symptoms with nobody's name on
    // the phrasing.
    await expect(card).toHaveCount(0);
    await expect(page.getByText("Lo que venís anotando")).toHaveCount(0);
  }

  // Whatever the build's variable says, no screen claims a review the registry
  // does not record.
  const configured = process.env.NEXT_PUBLIC_MEDICAL_REVIEWER?.trim();
  if (configured && !moodApprover) {
    await expect(page.getByText(configured)).toHaveCount(0);
  }
});

test("the symptom tool works unchanged with no insight to show", async ({
  page,
}) => {
  // Silence is the default and it is not a failure state: no "todavía no
  // encontramos patrones" box turning every quiet week into a small report
  // that the app looked and found nothing.
  await completeOnboarding(page, { daysAgo: 140 });
  await page.goto("/herramientas/sintomas");

  await expect(
    page.getByRole("heading", { name: "¿Cómo te sentís hoy?" }),
  ).toBeVisible();
  await expect(page.getByText(/todav[íi]a no.*patr/i)).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Lo que venís anotando" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: /Bien/ }).first().click();
  await page.getByRole("button", { name: "Náuseas", exact: true }).click();
  await page.getByRole("button", { name: /Guardar registro/ }).click();
  await expect(page.getByText(/guardado/i)).toBeVisible();
});
