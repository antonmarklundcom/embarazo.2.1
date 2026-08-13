// BUILD-PLAN E2 — share card + bump frame (feature map #30), pure half.
//
// The privacy rule for this feature is one sentence long and it is the whole
// design: **nothing about the pregnancy leaves the device except the week
// number, and the photo is composited on the phone.**
//
// So this module defines what may appear on a shared image, as a whitelist
// rather than as care taken at each call site, and `lib/share/draw.ts` can only
// draw what it is given. The due date, the FPP, the department, the sanatorio,
// the baby's nickname, symptoms, weight — none of it is available here. A
// future "just add the due date, it's cute" is a change to this file, which is
// where somebody will notice it.

/** Instagram-story-ish portrait; also fine as a WhatsApp status. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

/**
 * Everything a share image may carry. There is no field for anything else, and
 * `share.test.ts` asserts the drawing module reads nothing beyond these.
 */
export interface ShareCardContent {
  /** 1–42. The only pregnancy fact that ever leaves the phone. */
  week: number;
  /** Fixed app wordmark, not user content. */
  brand: string;
  /** Fixed line, not user content. */
  tagline: string;
}

export const SHARE_BRAND = "Mi Bebé";

/** Fields that must never reach a share image. Asserted against the source. */
export const SHARE_FORBIDDEN_FIELDS = [
  "dueDate",
  "fpp",
  "lmpDate",
  "babyName",
  "babies",
  "nickname",
  "department",
  "sanatorio",
  "weight",
  "symptoms",
  "note",
  "email",
  "phone",
] as const;

export function weekCardContent(week: number): ShareCardContent {
  return {
    week,
    brand: SHARE_BRAND,
    tagline: "Mi embarazo, semana a semana",
  };
}

export function bumpFrameContent(week: number): ShareCardContent {
  return {
    week,
    brand: SHARE_BRAND,
    tagline: "Mi pancita esta semana",
  };
}

/** "mi-bebe-semana-24.png" — a filename somebody can find in Descargas. */
export function shareFileName(week: number, kind: "semana" | "panza"): string {
  return `mi-bebe-${kind}-${week}.png`;
}

/** The caption offered with the image. Same rule: the week and nothing else. */
export function shareText(week: number): string {
  return `¡Semana ${week}! 💛`;
}

/**
 * Whether this browser can share the image itself rather than a link.
 *
 * Android Chrome can; several browsers expose `navigator.share` but refuse
 * files, which would silently share nothing. Checked with `canShare({files})`
 * rather than by sniffing the browser.
 */
export function canShareFiles(
  nav: { share?: unknown; canShare?: (data: { files: File[] }) => boolean },
  file: File,
): boolean {
  if (typeof nav.share !== "function") return false;
  if (typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}
