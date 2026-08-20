import type { CareSetting } from "@/lib/onboarding/personalisation";
import type { PriceBand, PriceEntry } from "@/lib/content/schemas";

// K10 — the presentation rules for "¿Cuánto cuesta?", as functions.
//
// Formatting money is not decoration here. The whole tool is numbers, every
// one of them is a range somebody sourced, and the two ways to mislead with a
// price band — rounding it into a precision it does not have, and printing a
// covered service as "₲ 0" — are both fixed once, here, rather than in JSX.

export const CARE_SETTING_LABEL: Record<CareSetting, string> = {
  ips: "IPS",
  publico: "Público",
  privado: "Privado",
};

/** The column order, which is also cheapest-first for most of the catalogue. */
export const CARE_SETTING_ORDER: CareSetting[] = ["ips", "publico", "privado"];

/**
 * Guaraníes, in the grouping people actually read.
 *
 * No decimals: the guaraní has no subunit in practice and `₲ 150.000,00` reads
 * as a foreign currency.
 */
export function formatGuaranies(amount: number): string {
  return `₲ ${amount.toLocaleString("es-PY", { maximumFractionDigits: 0 })}`;
}

/**
 * What a band says on screen.
 *
 * Three cases, and the first is the one that matters:
 *
 * - **Zero is "Sin costo", never "₲ 0".** A covered service is not a service
 *   that costs nothing to provide — it is one she does not pay for — and "₲ 0"
 *   invites the reading that it is worth nothing, in a country where "gratis"
 *   is often assumed to mean "worse". It is also the difference between a
 *   price and a right: IPS and the public system cover these because the law
 *   says so, and the row is telling her that.
 * - A fixed fee prints once rather than as a range of itself.
 * - Everything else is a range, because that is what the data is.
 */
export function bandLabel(band: PriceBand): string {
  if (band.max === 0) return "Sin costo";
  if (band.min === band.max) return formatGuaranies(band.min);
  return `${formatGuaranies(band.min)} – ${formatGuaranies(band.max)}`;
}

/** The band for a setting, or null when the entry has nothing to say about it. */
export function bandFor(
  entry: PriceEntry,
  setting: CareSetting,
): PriceBand | null {
  return entry.bands.find((band) => band.setting === setting) ?? null;
}

/**
 * The column to open on, given what she told onboarding (K9-F5).
 *
 * Falls back to `null` — meaning "show every column, expanded" — rather than
 * to a guess. Somebody who has not said where she is treated is exactly the
 * person the comparison is for.
 */
export function openingSetting(careSetting: CareSetting | undefined): CareSetting | null {
  return careSetting ?? null;
}

/**
 * es-PY date for the "precios de" line, e.g. "agosto de 2026".
 *
 * Month precision, deliberately. A day would imply the figures were checked on
 * that exact date; the month is what a price relevamiento honestly has.
 */
export function sourceMonthLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("es-PY", { month: "long", year: "numeric" });
}
