// WhatsApp deep-link helpers (build spec §6).

/** Strip a +595... number to bare E.164 digits for wa.me. */
export function toWaDigits(number: string): string {
  return number.replace(/[^\d]/g, "");
}

/** Build a wa.me URL with a pre-filled, URL-encoded message. */
export function waLink(number: string, message: string): string {
  const digits = toWaDigits(number);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

// C8 — placeholder numbers, and how a real one is recognised.
//
// Three files shipped `process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "+595000000000"`,
// which is a dead number wearing a fallback's clothes: with the env var unset
// (its state today) every one of those buttons opened a chat with nobody. That
// is the failure Z1 exists to prevent, and one of the three was the
// "Contactar a mi sanatorio" button on the contractions screen.
//
// `businessWhatsApp` is the one way to ask for that number, and it answers
// `null` rather than a number that cannot be reached.

/** The all-zero fallback and Z1's invented `+595 981 000 0xx` seed range. */
const PLACEHOLDER_WA_RE = /^\+?595(0{9}|981000\d{3})$/;

export function isPlaceholderWhatsApp(number: string | undefined): boolean {
  const trimmed = number?.replace(/[\s-]/g, "") ?? "";
  if (trimmed === "") return true;
  if (PLACEHOLDER_WA_RE.test(trimmed)) return true;
  // Anything that is not a +595 number with 9 digits is not a number we can
  // put behind a button and promise somebody answers.
  return !/^\+?595\d{9}$/.test(trimmed);
}

/** The business number, or `null` when none is configured. */
export function businessWhatsApp(raw: string | undefined): string | null {
  return isPlaceholderWhatsApp(raw) ? null : raw!.trim();
}

/** Default es-PY pre-fill referencing the current week when available. */
export function defaultPrefill(week?: number): string {
  if (week && week > 0) {
    return `Hola! Vi su información en Mi Bebé (semana ${week}). Quisiera más información.`;
  }
  return "Hola! Vi su información en Mi Bebé. Quisiera más información.";
}
