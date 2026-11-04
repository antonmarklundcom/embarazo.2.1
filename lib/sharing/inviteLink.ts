import { INVITE_FORBIDDEN_PATTERNS } from "@/lib/share/invite";
import { shareLink } from "@/lib/share/links";
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

/**
 * Night run item 1 — where the WhatsApp link lands. `/familia` needs an
 * account, so somebody opening the message was sent straight to a sign-in
 * screen with no idea why. `/cuenta/invitacion` is public — it sits under
 * `/cuenta`, which the account gate already leaves open — and it says what
 * the invitation is before sending them to sign in, carrying the code.
 * `/familia?codigo=` keeps working for links already sent.
 */
export const INVITE_LANDING_PATH = "/cuenta/invitacion";

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
  if (!isValidInviteCode(code)) return null;
  return shareLink(appUrl, `${INVITE_LANDING_PATH}?${INVITE_CODE_PARAM}=${code}`, "invita");
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

/**
 * Where `/cuenta/invitacion`'s button goes (night run item 1).
 *
 * Signed in: `/familia?codigo=`, which fills the code in for her to accept,
 * as it always has. Signed out: the sign-in screen, returning to
 * `/?codigo=` — Home's invited onboarding path (K9-F5), which starts at the
 * code step. The destination passes `safeReturnTo` like any other.
 */
export function inviteContinueHref(code: string, signedIn: boolean): string | null {
  if (!isValidInviteCode(code)) return null;
  if (signedIn) return `${FAMILY_INVITE_PATH}?${INVITE_CODE_PARAM}=${code}`;
  const returnTo = `/?${INVITE_CODE_PARAM}=${code}`;
  return `/cuenta?${new URLSearchParams({ ingreso: "1", returnTo })}`;
}

/**
 * The code in a saved sign-in destination of `/?codigo=…` (what
 * `inviteContinueHref` sends a signed-out visitor to), or null. Only the home
 * path counts: any other destination is a page that reads its own URL.
 */
export function inviteCodeFromReturnTo(returnTo: string | null | undefined): string | null {
  if (!returnTo || !returnTo.startsWith("/?")) return null;
  return inviteCodeFromSearch(returnTo.slice(1));
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
