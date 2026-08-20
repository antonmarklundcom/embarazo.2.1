import { PriceEntrySchema, validateContentArray, type PriceEntry } from "../content/schemas";
import { publishedOnly, reviewedOnly } from "./gate";
import rawPrices from "./prices.json";

// K10 / P6 — "¿Cuánto cuesta?" (docs/FABLE-PLAN-2026-08.md §3).
//
// Same pipeline as D3's food lookup: validated JSON, two gates, and nothing
// renders until a reviewer has signed it off. The gates matter more here than
// anywhere else in the app, and for a reason worth writing down.
//
// **A wrong price is not a wrong fact — it is a decision somebody makes.** A
// woman reading "cesárea: ₲ 9.000.000" and deciding she cannot afford a
// sanatorio has been given medical and financial advice by a number nobody
// checked. So this file ships with the figures marked `(placeholder)` in
// `source`, which `publishedOnly` catches, *and* with `reviewedBy` unset,
// which `reviewedOnly` catches. Either gate alone would hide them; both are
// applied because they fail differently — one catches "we made this up", the
// other catches "nobody has signed this off yet".
//
// The tool therefore renders an empty state today, on purpose, and lights up
// entry by entry as real figures land. That is the same promise the directory
// and the events list make.
const { valid, errors } = validateContentArray(
  "lib/seed/prices.json",
  rawPrices as unknown[],
  PriceEntrySchema,
);
if (errors.length > 0) {
  throw new Error(`Contenido inválido en lib/seed/prices.json:\n${errors.join("\n")}`);
}

export const PRICES: PriceEntry[] = valid;

/** The only export a call site may render. */
export const PUBLISHED_PRICES: PriceEntry[] = reviewedOnly(publishedOnly(PRICES));
