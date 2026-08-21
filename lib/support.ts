import { businessWhatsApp } from "./whatsapp";

// The channels a person can reach a human on, and whether any of them is real.
//
// This exists because of `/borrar-cuenta`. Google Play requires a **publicly
// reachable URL where deletion can be requested without installing the app and
// without signing in** (`docs/ANDROID-LAUNCH.md` §3.3). A page that says "write
// to us" and then shows no address is not that URL — it is a rejection with
// extra steps, and worse, it is a promise to a woman who wants her health data
// gone that nobody is on the other end of.
//
// The shape follows C8's `businessWhatsApp` exactly, and for the same reason:
// **an unconfigured channel answers `null`, never a placeholder.** Three files
// once shipped `process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "+595000000000"`,
// which is a dead number wearing a fallback's clothes. An email default would
// be the same mistake in a different field.

/** Obvious non-addresses, and the markers a copied `.env.example` leaves. */
const PLACEHOLDER_EMAIL_MARKERS = ["example.com", "___", "placeholder", "tbd", "cambiar"];

export function isPlaceholderEmail(value: string | undefined): boolean {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (trimmed === "") return true;
  if (PLACEHOLDER_EMAIL_MARKERS.some((marker) => trimmed.includes(marker))) return true;
  // Deliberately strict rather than RFC-complete: this address is printed on a
  // page as a promise that somebody reads it, so "looks roughly like an
  // address" is the wrong bar. Anything odd is treated as unconfigured, which
  // fails loudly at build time instead of quietly on the page.
  return !/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(trimmed);
}

/** The support address, or `null` when none is configured. */
export function supportEmail(raw: string | undefined): string | null {
  return isPlaceholderEmail(raw) ? null : raw!.trim();
}

export interface SupportChannels {
  email: string | null;
  whatsapp: string | null;
}

export function supportChannels(env: {
  NEXT_PUBLIC_SUPPORT_EMAIL?: string;
  NEXT_PUBLIC_BUSINESS_WHATSAPP?: string;
}): SupportChannels {
  return {
    email: supportEmail(env.NEXT_PUBLIC_SUPPORT_EMAIL),
    whatsapp: businessWhatsApp(env.NEXT_PUBLIC_BUSINESS_WHATSAPP),
  };
}

/**
 * Can a request for deletion actually reach a human?
 *
 * One configured channel is enough — a woman needs one way through, not two.
 * `lib/launchChecks.ts` fails a deployment build when this is false, because
 * the alternative is a live page telling people to contact an address that is
 * not there.
 */
export function hasDeletionChannel(channels: SupportChannels): boolean {
  return channels.email !== null || channels.whatsapp !== null;
}
