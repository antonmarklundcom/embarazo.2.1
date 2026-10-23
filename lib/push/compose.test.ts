import { describe, expect, it, vi } from "vitest";
import { composeAllowedNotification } from "./compose";
import { PUSH_CATEGORIES, type PushCategory } from "./categories";
import { weeklyTipSentence, cheerSentence } from "./sentences";

const NOW = new Date(2026, 9, 23, 10).getTime();
const local = { nextAppointment: NOW + 24 * 60 * 60 * 1000, companionReminder: true, week: 22, birthDate: null };

describe("notification composition respects device category consent", () => {
  for (let bits = 0; bits < 16; bits += 1) {
    const categories = PUSH_CATEGORIES.filter((_, index) => bits & (1 << index));
    it(`enforces opt-outs for ${JSON.stringify(categories)}`, async () => {
      const companion = vi.fn(async () => local.nextAppointment);
      const cheer = vi.fn(async () => "abrazo");
      const notice = await composeAllowedNotification(local, categories, NOW, companion, cheer);
      if (categories.includes("recordatorios")) expect(notice.title).toContain("control prenatal");
      else if (categories.includes("mimos")) expect(notice).toEqual(cheerSentence("abrazo"));
      else if (categories.includes("consejos")) expect(notice).toEqual(weeklyTipSentence(22));
      else expect(notice.body).toBe("Tocá para abrir la app.");
      if (!categories.includes("recordatorios")) expect(companion).not.toHaveBeenCalled();
      if (!categories.includes("mimos")) expect(cheer).not.toHaveBeenCalled();
    });
  }

  it("weekly-only never fetches a fresh cheer or companion health data", async () => {
    const companion = vi.fn(async () => local.nextAppointment);
    const cheer = vi.fn(async () => "abrazo");
    const notice = await composeAllowedNotification(local, ["consejos"], NOW, companion, cheer);
    expect(notice).toEqual(weeklyTipSentence(22));
    expect(companion).not.toHaveBeenCalled();
    expect(cheer).not.toHaveBeenCalled();
  });

  it("does not expose baby age or week after all categories are disabled", async () => {
    const notice = await composeAllowedNotification({ ...local, birthDate: NOW - 7 * 86_400_000 }, [], NOW, async () => null, async () => null);
    expect(notice.body).toBe("Tocá para abrir la app.");
  });

  it("uses the companion reminder only when recordatorios is allowed", async () => {
    const notice = await composeAllowedNotification({ ...local, nextAppointment: null }, ["recordatorios"] as PushCategory[], NOW, async () => local.nextAppointment, async () => null);
    expect(notice.title).toBe("Acompañala al control");
  });
});
