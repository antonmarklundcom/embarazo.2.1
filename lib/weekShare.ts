// The week page's "mandáselo" links — a WhatsApp message to her pareja or her
// familia with that week's perspective text.
//
// Same rule as the share image (`lib/share/card.ts`): nothing personal leaves
// the phone. The text is the week's published copy for everyone at that
// week, plus the app's public link; no due date, no name, no data of hers.
// She picks the chat in WhatsApp — `wa.me/?text=` carries no number.
//
// The link is that week's public page with `?src=semana` (night run item 1),
// not the bare app URL: the person who gets the message can read the week
// without an account, and the install it brings is counted as a share.

import { weekShareLink } from "@/lib/share/links";

export function weekMessage(
  week: number,
  text: string,
  appUrl: string | undefined,
): string {
  const url = weekShareLink(appUrl, week, "semana");
  const tail = url ? `\n\nSeguí el embarazo semana a semana: ${url}` : "";
  return `Semana ${week} — ${text}${tail}`;
}

export function whatsAppShareHref(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
