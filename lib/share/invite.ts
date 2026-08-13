// BUILD-PLAN E3 — "invitá a una amiga" (feature map #31), pure half.
//
// The distribution channel in Paraguay is a WhatsApp message from somebody you
// trust, not an app-store search. This is that message, and the only two things
// it may contain are a sentence about the app and the app's own URL.
//
// It is also the test-round path: during the friends-and-family round, "invitá
// a una amiga" is how the round grows, and the same link is what a tester
// forwards.

/** What the invitation says. Fixed copy — nothing here is user content. */
export const INVITE_TITLE = "Mi Bebé";

export const INVITE_TEXT =
  "Estoy usando Mi Bebé, una app de embarazo hecha para Paraguay: semana a " +
  "semana, qué se puede comer, tus derechos y los números de emergencia. " +
  "Funciona sin internet y es gratis.";

/**
 * The invite payload, or `null` when there is nowhere to send anybody.
 *
 * With `NEXT_PUBLIC_APP_URL` unset — local development, and any build before
 * the domain exists — there is no link, and an invitation to nowhere is worse
 * than no button. The call site renders nothing.
 */
export interface InvitePayload {
  title: string;
  text: string;
  url: string;
}

export function invitePayload(appUrl: string | undefined): InvitePayload | null {
  const url = appUrl?.trim();
  if (!url) return null;
  if (!/^https?:\/\//.test(url)) return null;
  return { title: INVITE_TITLE, text: INVITE_TEXT, url };
}

/** What goes on the clipboard when the browser cannot open a share sheet. */
export function inviteClipboardText(payload: InvitePayload): string {
  return `${payload.text} ${payload.url}`;
}

/**
 * Personalisations that must never appear in an invitation.
 *
 * An invite is the one message in this app addressed to somebody who is not
 * the user, and it gets forwarded. "Mirá, estoy en la semana 24" is a tempting
 * personalisation and it publishes her pregnancy to whoever the message reaches
 * next.
 *
 * These are patterns rather than words on purpose: the copy legitimately says
 * "semana a semana" about the app itself, and a bare "semana" ban would either
 * fail on honest copy or push somebody into rewording it for the wrong reason.
 * What is banned is a *number attached to her* — "semana 24", "FPP 12/03" — and
 * the fields that are hers alone.
 */
export const INVITE_FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /semanas?\s*\d/i,
  /week\s*\d/i,
  /\bfpp\b/i,
  /duedate/i,
  /\bdepartamento\b/i,
  /\bsanatorio\b/i,
  /se llama/i,
];
