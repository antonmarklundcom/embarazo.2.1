// Night run item 2 — when the compact install prompt shows, and when it offers
// Google Play. Pure: the hook and components read the browser and pass the
// facts in, so every rule here is unit-tested.

import type { InstallDevice } from "@/lib/installDevice";
import { playStoreUrl } from "@/lib/rating/playReview";

/** Device-local memory of the compact prompt. Never sent anywhere. */
export const INSTALL_NUDGE_KEY = "mibebe.installNudge";

/**
 * Where the compact prompt can appear.
 *
 * - `onboarded`: Hoy, right after onboarding finished on this device. Once.
 * - `first-tool`: the first tool screen opened after onboarding. Once.
 * - `public`: a public week or guide page. Until she says "Ahora no".
 */
export type NudgeContext = "onboarded" | "first-tool" | "public";

export interface NudgeMemory {
  /** "Ahora no" — never again, anywhere. */
  dismissed?: boolean;
  /** The once-only moments already used. */
  seen?: NudgeContext[];
}

export function parseNudgeMemory(raw: string | null): NudgeMemory {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object") return {};
    const v = value as { dismissed?: unknown; seen?: unknown };
    return {
      dismissed: v.dismissed === true,
      seen: Array.isArray(v.seen)
        ? v.seen.filter((s): s is NudgeContext => s === "onboarded" || s === "first-tool" || s === "public")
        : [],
    };
  } catch {
    return {};
  }
}

export function showInstallNudge(input: {
  context: NudgeContext;
  memory: NudgeMemory;
  /** Opened from the home-screen icon, or inside the Play wrapper. */
  standalone: boolean;
  device: InstallDevice | null;
}): boolean {
  // Phones only: on a computer "instalala en tu teléfono" is noise, and the
  // full card in Hoy's footer and Ajustes already carries the QR for that case.
  if (input.standalone || input.device === null || input.device === "desktop") return false;
  if (input.memory.dismissed) return false;
  if (input.context === "public") return true;
  return !(input.memory.seen ?? []).includes(input.context);
}

/** The Play listing, when the switch is on (`lib/rating/playReview.ts`). */
export const PLAY_URL = playStoreUrl(process.env.NEXT_PUBLIC_PLAY_STORE_URL);

/**
 * "Disponible en Google Play": only with a real listing URL, only on Android,
 * and never inside the Play wrapper itself (a TWA launch carries an
 * `android-app://` referrer, remembered for the session).
 */
export function offerPlayLink(input: {
  playUrl: string | null;
  device: InstallDevice | null;
  insideTwa: boolean;
}): boolean {
  return input.playUrl !== null && input.device === "android" && !input.insideTwa;
}

/** Which shell moment a path is, if any. Hoy's own moment is not here. */
export function nudgeContextFor(pathname: string, onboarded: boolean): NudgeContext | null {
  if (/^\/(?:semana\/\d+|guias\/[a-z0-9-]+)$/.test(pathname)) return "public";
  if (onboarded && /^\/herramientas\/[a-z0-9-]+/.test(pathname)) return "first-tool";
  return null;
}
