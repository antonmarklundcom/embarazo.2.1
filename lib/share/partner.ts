import { APP_NAME } from "@/lib/brand";
import { perspectivesFor } from "@/lib/seed/perspectives";

// Share card v2 — "Contale a tu pareja", the text-only share next to the image.
//
// The week card is for her status; this one is for one person. It sends C4's
// partner perspective for the week ("para tu pareja") straight to WhatsApp, so
// the most useful paragraph in the app for the person beside her arrives
// without them installing anything first. It is the same text every partner in
// that week band reads in the app — fixed content keyed on the week, like the
// image — so it carries nothing of hers: no due date, no name, no symptoms.
//
// It lives here and not in `draw.ts` on purpose: the drawing module is
// asserted to hold no URL, and a `wa.me` link is exactly that.

/**
 * "Semana 20 — <partner text>" plus a line with the app's link, or `null` when
 * no perspective band covers the week (nothing worth sending).
 *
 * The link follows the rule every other invitation in the app follows: only
 * when `NEXT_PUBLIC_APP_URL` is set and is an http(s) URL. Without one the
 * message still goes — the paragraph is the point — just without a link to
 * nowhere.
 */
export function partnerShareText(
  week: number,
  appUrl: string | undefined,
): string | null {
  const band = perspectivesFor(week);
  if (!band) return null;
  const message = `Semana ${week} — ${band.pareja}`;
  const url = appUrl?.trim();
  if (!url || !/^https?:\/\//.test(url)) return message;
  return `${message}\n\nLo leí en ${APP_NAME}: ${url}`;
}

/**
 * A `wa.me` link carrying the text. No number: `wa.me/?text=` opens
 * WhatsApp's own contact picker, so the app never asks for a phone number or
 * reads a contact list — same as the family invite (`lib/sharing/inviteLink`).
 */
export function partnerWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
