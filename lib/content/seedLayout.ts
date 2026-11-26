// Where a seed JSON file may live (docs/CONTENT-COUNTRY-RULE.md, section 2).
//
// New content goes in lib/seed/shared/ (true in any country) or lib/seed/py/
// (only true or useful in Paraguay), as `{ "lang": "es-PY", "items": [...] }`.
// Nothing new goes directly under lib/seed/. Pure: the caller lists the files
// and reads them, so this runs the same in vitest and in
// scripts/validate-content.mts (node --experimental-strip-types, no aliases).

const SEED_DIR = "lib/seed/";
const RULE_DOC = "docs/CONTENT-COUNTRY-RULE.md";
const COUNTRY_FOLDERS = ["shared", "py"];
const EXPECTED_LANG = "es-PY";

// The JSON files that sat directly under lib/seed/ when the rule came into
// force (26 November 2026). They stay where they are until phase 3 moves them.
// This list only ever shrinks: remove a name when its file moves, never add one.
export const LEGACY_ROOT_SEED_FILES: readonly string[] = [
  "approvals.json",
  "articles.json",
  "comparisons.json",
  "directory.json",
  "ejercicios.json",
  "events.json",
  "faq.json",
  "food.json",
  "insights.json",
  "limbSizes.json",
  "names.json",
  "obstetraNotes.json",
  "perspectives.json",
  "placements.json",
  "prices.json",
  "recomendados.json",
  "reviewers.json",
  "videos.json",
  "weeklyLines.json",
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Problems with the layout of the seed JSON files.
 *
 * @param paths repo-relative paths of `.json` files under lib/seed/ (either
 *   slash direction; anything else is ignored).
 * @param read returns the parsed contents of one of those paths.
 * @returns one plain-Spanish line per problem; empty when all is in order.
 */
export function seedLayoutProblems(
  paths: readonly string[],
  read: (path: string) => unknown,
): string[] {
  const problems: string[] = [];
  const sorted = [...paths].map((p) => p.replace(/\\/g, "/")).sort();

  for (const path of sorted) {
    if (!path.startsWith(SEED_DIR) || !path.endsWith(".json")) continue;
    const rest = path.slice(SEED_DIR.length);
    const parts = rest.split("/");

    if (parts.length === 1) {
      if (!LEGACY_ROOT_SEED_FILES.includes(rest)) {
        problems.push(
          `${path}: archivo de contenido nuevo directamente en lib/seed/ — movelo a lib/seed/shared/ (si vale en cualquier país) o a lib/seed/py/ (si es solo de Paraguay); ver ${RULE_DOC}`,
        );
      }
      continue;
    }

    const folder = parts[0] ?? "";
    if (!COUNTRY_FOLDERS.includes(folder)) {
      problems.push(
        `${path}: carpeta desconocida "lib/seed/${folder}/" — el contenido nuevo va en lib/seed/shared/ o lib/seed/py/; ver ${RULE_DOC}`,
      );
      continue;
    }

    let data: unknown;
    try {
      data = read(path);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      problems.push(`${path}: no se pudo leer como JSON (${reason})`);
      continue;
    }

    if (!isPlainObject(data)) {
      problems.push(
        `${path}: tiene que ser un objeto { "lang": "${EXPECTED_LANG}", "items": [ ... ] }, no una lista ni otro valor; ver ${RULE_DOC}`,
      );
      continue;
    }
    if (data.lang !== EXPECTED_LANG) {
      problems.push(
        `${path} — campo "lang": tiene que ser "${EXPECTED_LANG}" (ahora: ${JSON.stringify(data.lang ?? null)})`,
      );
    }
    if (!Array.isArray(data.items)) {
      problems.push(
        `${path} — campo "items": falta o no es una lista — las entradas van en "items": [ ... ]`,
      );
    }
  }

  return problems;
}
