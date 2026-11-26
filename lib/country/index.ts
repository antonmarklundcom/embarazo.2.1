// The active country. New country facts go in lib/country/py.ts and screens read
// them from here, never from a literal; the rule is docs/CONTENT-COUNTRY-RULE.md.
import { PY } from "./py.ts";

export type { Country } from "./types.ts";

export const COUNTRY = PY;
