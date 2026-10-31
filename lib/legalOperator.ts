// The legal operator ("Responsable") named on /privacidad and /terminos.
//
// Google Play shows the developer account's verified legal name on the
// listing, and the privacy policy must name the same entity
// (docs/ANDROID-LAUNCH.md §3.1.1). The owner may publish with the Swedish AB
// or with a Paraguayan RUC holder, so the name comes from build-time env
// instead of a hard-coded string. Switching is an environment change and a
// rebuild, not a code release.
//
//   NEXT_PUBLIC_LEGAL_OPERATOR_NAME     e.g. "Anton Marklund" or "Mi Empresa EAS"
//   NEXT_PUBLIC_LEGAL_OPERATOR_COUNTRY  e.g. "Paraguay"
//   NEXT_PUBLIC_LEGAL_OPERATOR_TAX_ID   e.g. "RUC 1234567-8" (optional)
//
// With no name set, the operator stays the one the pages have named since
// 12 October 2026, so an unconfigured build changes nothing.

export interface LegalOperator {
  name: string;
  country: string | null;
  taxId: string | null;
}

export const DEFAULT_LEGAL_OPERATOR: LegalOperator = {
  name: "Marklund Sales & Marketing AB",
  country: "Suecia",
  taxId: null,
};

/** Markers a copied `.env.example` or an unfinished value leaves behind. */
const PLACEHOLDER_MARKERS = ["___", "placeholder", "tbd", "cambiar", "example"];

function clean(raw: string | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (value === "") return null;
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker)) ? null : value;
}

export function legalOperator(env: Readonly<Record<string, string | undefined>>): LegalOperator {
  const name = clean(env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME);
  // Country and tax ID belong to the configured name; they never decorate the default.
  if (!name) return DEFAULT_LEGAL_OPERATOR;
  return {
    name,
    country: clean(env.NEXT_PUBLIC_LEGAL_OPERATOR_COUNTRY),
    taxId: clean(env.NEXT_PUBLIC_LEGAL_OPERATOR_TAX_ID),
  };
}
