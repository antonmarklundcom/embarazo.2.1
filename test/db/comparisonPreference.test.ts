import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { setShowComparison } from "@/lib/hero/preferences";
import { comparisonMode } from "@/lib/hero/comparisonMode";
describe("fruit/measurement preference persistence", () => {
  it("retains measures across reopening the phone database, and changes back to fruits", async () => {
    await db().profile.add({city:"Asunción", createdAt: Date.now()});
    await setShowComparison(false);
    db().close(); await db().open();
    expect(comparisonMode((await db().profile.toArray())[0]?.showComparison)).toBe("measures");
    await setShowComparison(true);
    expect(comparisonMode((await db().profile.toArray())[0]?.showComparison)).toBe("fruits");
    expect(await db().profile.count()).toBe(1);
  });
  it("does not create an incomplete onboarding profile to save a preference", async () => {
    await setShowComparison(false);
    expect(await db().profile.count()).toBe(0);
  });
});
