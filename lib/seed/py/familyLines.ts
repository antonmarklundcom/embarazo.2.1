import { FamilyLineSchema, validateContentArray, type FamilyLine } from "../../content/schemas";
import { publishedOnly } from "../gate";
import rawFile from "./familyLines.json";

// A line each week for the wider family: la abuela, la tía, la madrina. In
// Paraguay they are often who accompanies her, so the "Para la familia" tab
// gets one concrete, kind thing they can do or say that week.
//
// Same pattern as lib/seed/weeklyLines.ts: validated at import and again in
// `npm run validate:content`, passed through `publishedOnly()`, and a week
// without a line renders nothing. It lives in lib/seed/py/ because what a
// Paraguayan family does (the madrina, the olla left at the door) is local.

const file = rawFile as { lang: string; items: unknown[] };
const { valid, errors } = validateContentArray(
  "lib/seed/py/familyLines.json",
  file.items,
  FamilyLineSchema,
  (entry) => String(entry.week),
);
if (errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/py/familyLines.json:\n${errors.join("\n")}`,
  );
}

export const FAMILY_LINES_LANG = file.lang;

export const PUBLISHED_FAMILY_LINES: FamilyLine[] = publishedOnly(valid);

const BY_WEEK = new Map(PUBLISHED_FAMILY_LINES.map((entry) => [entry.week, entry.text]));

/** The family's line for a week, or `null` when there isn't one. */
export function familyLine(week: number): string | null {
  return BY_WEEK.get(week) ?? null;
}
