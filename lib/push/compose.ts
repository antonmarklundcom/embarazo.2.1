import { APP_NAME } from "@/lib/brand";
import { companionReminderSentence, ownReminderSentence } from "@/lib/appointments";
import { babyAgeSentence } from "@/lib/baby/push";
import { cheerSentence, weeklyTipSentence } from "./sentences";
import type { PushCategory } from "./categories";

export interface LocalNotificationState {
  nextAppointment: number | null;
  companionReminder: boolean;
  week: number | null;
  birthDate: number | null;
}

/** Compose only categories explicitly allowed on this device. No push payload. */
export async function composeAllowedNotification(
  local: LocalNotificationState,
  categories: readonly PushCategory[],
  now: number,
  readCompanion: () => Promise<number | null>,
  readCheer: () => Promise<string | null>,
): Promise<{ title: string; body: string; url?: string }> {
  if (categories.includes("recordatorios")) {
    const own = ownReminderSentence(local.nextAppointment, now);
    if (own) return { ...own, url: "/herramientas/resumen" };
    if (local.companionReminder) {
      const companion = companionReminderSentence(await readCompanion(), now);
      if (companion) return companion;
    }
  }
  if (categories.includes("mimos")) {
    const cheer = await readCheer();
    if (cheer) return cheerSentence(cheer);
  }
  if (categories.includes("consejos")) {
    if (local.birthDate !== null) return { ...babyAgeSentence(local.birthDate, now), url: "/" };
    const weekly = weeklyTipSentence(local.week);
    if (weekly) return weekly;
  }
  // userVisibleOnly requires a visible notice even when a delayed poke is
  // delivered after opt-out. Never infer another category or expose its data.
  return { title: APP_NAME, body: "Tocá para abrir la app." };
}
