import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ArticleSchema, validateContentArray } from "../lib/content/schemas.ts";
import { indexEntryOf } from "../lib/articles/index.ts";

// K11 — generate `lib/articles/index.json` from the article bodies.
//
// Run by `prebuild`, so a build always ships an index that matches the content
// it was built from. The file is committed (a build must not depend on a
// generator having been run by hand on somebody's laptop), and
// `lib/articles/index.test.ts` fails if the committed copy has drifted from
// `articles.json` — which is what keeps a generated, committed file honest.
//
// It writes only when the content actually changes, so a no-op run leaves the
// working tree clean and `git status` stays a useful signal.

const OUT = join(process.cwd(), "lib", "articles", "index.json");

// Read and validate the JSON directly rather than importing `lib/seed/articles`
// — that module resolves its imports the way the bundler does, not the way
// plain Node does, which is the same reason `validate-content.mts` reads files
// instead of importing loaders.
const raw = JSON.parse(
  readFileSync(join(process.cwd(), "lib", "seed", "articles.json"), "utf8"),
) as unknown[];

const { valid, errors } = validateContentArray(
  "lib/seed/articles.json",
  raw,
  ArticleSchema,
  (a) => a.slug,
);
if (errors.length > 0) {
  console.error(`Contenido inválido en lib/seed/articles.json:\n${errors.join("\n")}`);
  process.exit(1);
}

const index = valid.map(indexEntryOf);
const next = `${JSON.stringify(index, null, 2)}\n`;

let current = "";
try {
  current = readFileSync(OUT, "utf8");
} catch {
  // First run.
}

if (current === next) {
  console.log(`✓ Índice de guías al día (${index.length} entradas).`);
} else {
  writeFileSync(OUT, next, "utf8");
  console.log(`✓ Índice de guías regenerado (${index.length} entradas).`);
}
