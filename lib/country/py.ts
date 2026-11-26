import type { Country } from "./types.ts";

// Paraguay. Each value is one the app already uses elsewhere:
// - locale "es-PY": every toLocaleDateString/toLocaleTimeString call (e.g. lib/appointments.ts).
// - currency "PYG": priceCurrency in lib/seo/jsonLd.ts.
// - timeZone "America/Asuncion": playwright.config.ts and e2e/helpers/dates.ts.
export const PY: Country = {
  locale: "es-PY",
  currency: "PYG",
  timeZone: "America/Asuncion",
};
