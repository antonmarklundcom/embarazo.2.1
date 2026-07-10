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

/** Default es-PY pre-fill referencing the current week when available. */
export function defaultPrefill(week?: number): string {
  if (week && week > 0) {
    return `Hola! Vi su información en Mi Bebé (semana ${week}). Quisiera más información.`;
  }
  return "Hola! Vi su información en Mi Bebé. Quisiera más información.";
}
