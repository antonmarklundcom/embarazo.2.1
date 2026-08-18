import { INVITE_FORBIDDEN_PATTERNS } from "@/lib/share/invite";
import { isValidInviteCode } from "./fields";

// BUILD-PLAN K1 — the WhatsApp message that carries an E1 invite.
//
// E3's `lib/share/invite.ts` is the *app* invitation ("pasale la app a una
// amiga"): a fixed sentence and the app's URL, addressed to a stranger. This is
// a different message with a stricter job — it names no pregnancy but it does
// carry a capability, the single-use invite code, in the link.
//
// Two rules, both asserted by test:
//
//  1. **Nothing personal travels.** The text is fixed copy. Not the week, not
//     the due date, not the baby's name — a WhatsApp message gets forwarded,
//     and E3's `INVITE_FORBIDDEN_PATTERNS` is the list of things that would
//     publish her pregnancy to whoever it reaches next. The same list guards
//     this message, so the two invitations cannot drift apart.
//  2. **The code is a capability, so it goes in the URL and nowhere else.**
//     It is single-use and expires in 14 days (E1), which is what makes putting
//     it in a link acceptable: the first person to open it consumes it, and a
//     forwarded link is then spent rather than a standing grant.

export const FAMILY_INVITE_PATH = "/familia";

/** The query parameter `/familia` reads a code out of. Spanish, like the route. */
export const INVITE_CODE_PARAM = "codigo";

export type InviteRole = "partner" | "family";

export interface FamilyInvitePayload {
  title: string;
  text: string;
  url: string;
  role: InviteRole;
}

/**
 * How each role is addressed. Voseo, warm, and deliberately free of any detail
 * about the pregnancy itself.
 */
const INVITE_TEXT: Record<InviteRole, string> = {
  partner:
    "¿Me acompañás? Te invito a seguir nuestro embarazo en Mi Bebé, la app " +
    "de embarazo hecha para Paraguay. Entrá con este link y ya quedás " +
    "conmigo en la app:",
  family:
    "Te invito a acompañarme en Mi Bebé, la app de embarazo hecha para " +
    "Paraguay. Entrá con este link para seguirme desde tu teléfono:",
};

const INVITE_TITLE = "Mi Bebé";

/**
 * The link, or `null` when there is nowhere to send anybody.
 *
 * With `NEXT_PUBLIC_APP_URL` unset — local development, and any build before
 * the domain exists — there is no link to send, and an invitation to nowhere is
 * worse than no button. Same rule E3 applies.
 */
export function familyInviteUrl(
  appUrl: string | undefined,
  code: string,
): string | null {
  const base = appUrl?.trim();
  if (!base) return null;
  if (!/^https?:\/\//.test(base)) return null;
  if (!isValidInviteCode(code)) return null;
  return `${base.replace(/\/+$/, "")}${FAMILY_INVITE_PATH}?${INVITE_CODE_PARAM}=${code}`;
}

export function familyInvitePayload(
  appUrl: string | undefined,
  code: string,
  role: InviteRole,
): FamilyInvitePayload | null {
  const url = familyInviteUrl(appUrl, code);
  if (!url) return null;
  return { title: INVITE_TITLE, text: INVITE_TEXT[role], url, role };
}

/** What goes on the clipboard when the browser has no share sheet. */
export function familyInviteClipboardText(payload: FamilyInvitePayload): string {
  return `${payload.text} ${payload.url}`;
}

/**
 * A `wa.me` link for the invitation.
 *
 * No number: `wa.me/?text=` opens WhatsApp's own contact picker, so the app
 * never has to ask for a phone number or read a contact list to send this.
 */
export function familyInviteWhatsAppUrl(payload: FamilyInvitePayload): string {
  return `https://wa.me/?text=${encodeURIComponent(
    familyInviteClipboardText(payload),
  )}`;
}

/** Read a code out of a landing URL's query string. Returns null if absent or malformed. */
export function inviteCodeFromSearch(search: string): string | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  const raw = params.get(INVITE_CODE_PARAM);
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return isValidInviteCode(code) ? code : null;
}

/** Re-exported so the test — and any future caller — guards both invitations with one list. */
export { INVITE_FORBIDDEN_PATTERNS };
