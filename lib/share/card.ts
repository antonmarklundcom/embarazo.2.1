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
//
// What the redesign (share card v2) added, and why it is still the same rule:
// the card now also carries the baby's size, the trimester and, on a handful of
// weeks, a milestone label ("Mitad del camino"). Every one of those is a pure
// function of the week number — the same text any other mother in the same
// week gets, looked up from `lib/weeks.ts` and a fixed table below. None of it
// is *hers*. The test that pins the key set (`share.test.ts`) changed in the
// same commit, so adding a field is still a visible, reviewed decision.

import { APP_NAME } from "@/lib/brand";
import { getTrimester } from "@/lib/pregnancy";
import { getWeek, hasSizeComparison, sizeLine } from "@/lib/weeks";

/** Instagram-story-ish portrait; also fine as a WhatsApp status. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

/**
 * Everything a share image may carry. There is no field for anything else, and
 * `share.test.ts` asserts the drawing module reads nothing beyond these.
 *
 * Read the list as "the week, and things derived from the week": `trimester`,
 * `size` and `milestone` are lookups keyed on `week` alone, so the week-20 card
 * is identical for every user in week 20. The bump frame adds her photo, which
 * is composited on the phone and leaves it only if she shares it herself.
 */
export interface ShareCardContent {
  /** 1–42. The only pregnancy fact that ever leaves the phone. */
  week: number;
  /** 1, 2 or 3 — derived from `week` (`lib/pregnancy.getTrimester`). */
  trimester: 1 | 2 | 3;
  /**
   * "Del tamaño de una banana" — `lib/weeks.ts`'s `sizeLine`, keyed on the
   * week. `null` for weeks 1–2, where there is nothing to compare yet and
   * "Todavía no hay embrión" is not a line anybody wants on a celebration
   * card; the drawing puts the tagline in that slot instead.
   */
  size: string | null;
  /** A fixed label for a handful of special weeks ("Mitad del camino"), else `null`. */
  milestone: string | null;
  /** Fixed app wordmark, not user content. */
  brand: string;
  /** Fixed public domain for the footer pill, not user content. */
  site: string;
  /** Fixed line, not user content. */
  tagline: string;
}

export const SHARE_BRAND = APP_NAME;

/**
 * The domain on the footer pill. Text on a picture, not a link: the image is a
 * PNG, and a domain in it is something a friend reads off a WhatsApp status
 * and types — which is how a status post turns into an install. A constant
 * rather than `NEXT_PUBLIC_APP_URL` on purpose: the card must say the public
 * name on a preview build too, and the drawing module takes no environment.
 */
export const SHARE_SITE = "embarazo.com.py";

/**
 * Weeks worth a label of their own. Keyed on the week number, so the label is
 * the same for everybody in that week — it celebrates the calendar, not her.
 * Kept short: it replaces the "SEMANA 20 · 2.º TRIMESTRE" eyebrow, which is
 * set in spaced capitals across a 1080px card. Week 40's label is not "Semana
 * 40": the headline right under it already says so, and an eyebrow that
 * repeats the headline reads as a mistake.
 */
export const SHARE_MILESTONES: Readonly<Record<number, string>> = {
  12: "Fin del primer trimestre",
  20: "Mitad del camino",
  28: "Tercer trimestre",
  37: "A término",
  40: "Ya falta poquito",
};

/** Fields that must never reach a share image. Asserted against the source. */
export const SHARE_FORBIDDEN_FIELDS = [
  "dueDate",
  "fpp",
  "lmpDate",
  "daysLeft",
  "daysElapsed",
  "babyName",
  "babies",
  "nickname",
  "department",
  "sanatorio",
  "weight",
  "weightG",
  "lengthCm",
  "symptoms",
  "note",
  "email",
  "phone",
] as const;

/** The week-derived fields both cards share. */
function weekFacts(
  week: number,
): Pick<ShareCardContent, "week" | "trimester" | "size" | "milestone"> {
  const { sizeComparison } = getWeek(week);
  return {
    week,
    trimester: getTrimester(week),
    size: hasSizeComparison(sizeComparison) ? sizeLine(sizeComparison) : null,
    milestone: SHARE_MILESTONES[week] ?? null,
  };
}

export function weekCardContent(week: number): ShareCardContent {
  return {
    ...weekFacts(week),
    brand: SHARE_BRAND,
    site: SHARE_SITE,
    tagline: "Mi embarazo, semana a semana",
  };
}

export function bumpFrameContent(week: number): ShareCardContent {
  return {
    ...weekFacts(week),
    brand: SHARE_BRAND,
    site: SHARE_SITE,
    tagline: "Mi pancita esta semana",
  };
}

/**
 * "SEMANA 20 · 2.º TRIMESTRE", or the milestone label on the weeks that have
 * one. Upper-cased here rather than with a canvas trick so a test can read the
 * exact string the image carries.
 */
export function shareEyebrow(content: ShareCardContent): string {
  const label =
    content.milestone ?? `Semana ${content.week} · ${content.trimester}.º trimestre`;
  return label.toLocaleUpperCase("es");
}

/** "¡Semana 20!" — the headline both cards lead with. */
export function shareHeadline(content: ShareCardContent): string {
  return `¡Semana ${content.week}!`;
}

/** "mi-bebe-semana-24.png" — a filename somebody can find in Descargas. */
export function shareFileName(week: number, kind: "semana" | "panza"): string {
  return `mi-bebe-${kind}-${week}.png`;
}

/**
 * The caption offered with the image. Same rule: the week and what the week
 * implies, nothing else. "Mi bebé ya es del tamaño de una banana" is the line
 * that gets replies — friends answer the fruit, not the number. Weeks 1–2 have
 * no size to offer, so their caption is the week alone.
 */
export function shareText(week: number): string {
  const { sizeComparison } = getWeek(week);
  if (!hasSizeComparison(sizeComparison)) return `¡Semana ${week}! 💛`;
  return `¡Semana ${week}! Mi bebé ya es del tamaño de ${sizeComparison} 💛`;
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
