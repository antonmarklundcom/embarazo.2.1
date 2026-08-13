import { BabyNameSchema, validateContentArray } from "../content/schemas";
import { publishedOnly } from "./gate";
import type { BabyName, NameOrigin } from "../types";
import rawNames from "./names.json";

// BUILD-PLAN D2 — the baby-name catalogue (feature map #21).
//
// The Guaraní names are the reason this tool exists. A translated global app
// ships the same Sofía/Mateo list everywhere; Arami, Yvoty, Panambi and Ñasaindy
// with their meanings are something only an app built here has, and they are
// what makes this the screen somebody screenshots into a family WhatsApp group
// (which is what E2's share card is for).

const { valid, errors } = validateContentArray(
  "lib/seed/names.json",
  rawNames as unknown[],
  BabyNameSchema,
  (entry) => entry.name,
);
if (errors.length > 0) {
  throw new Error(`Contenido inválido en lib/seed/names.json:\n${errors.join("\n")}`);
}

export const PUBLISHED_NAMES: BabyName[] = publishedOnly(valid);

export const ORIGIN_LABELS: Record<NameOrigin, string> = {
  guarani: "Guaraní",
  espanol: "Español",
  biblico: "Bíblico",
};

export const GENDER_LABELS: Record<BabyName["gender"], string> = {
  f: "Nena",
  m: "Varón",
  u: "Para cualquiera",
};

/**
 * Filter for the picker.
 *
 * Search matches the name and the meaning, because "luna" should find Yasy —
 * somebody looking for a name usually knows what they want it to mean before
 * they know how it is spelled in Guaraní. Accents are folded for the same
 * reason: nobody types "Ñasaindy" with the tilde on a phone keyboard.
 */
export function filterNames(
  names: readonly BabyName[],
  filters: { origin?: NameOrigin | "todos"; gender?: BabyName["gender"] | "todos"; query?: string },
): BabyName[] {
  const query = fold(filters.query ?? "");
  return names.filter((entry) => {
    if (filters.origin && filters.origin !== "todos" && entry.origin !== filters.origin) {
      return false;
    }
    if (filters.gender && filters.gender !== "todos" && entry.gender !== filters.gender) {
      return false;
    }
    if (query === "") return true;
    return fold(entry.name).includes(query) || fold(entry.meaning).includes(query);
  });
}

/** Lowercase, accent-folded, so "arami" finds "Aramí" and "nasaindy" finds "Ñasaindy". */
export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
