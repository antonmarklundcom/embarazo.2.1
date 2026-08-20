import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ArticleSchema,
  DirectoryListingSchema,
  AdPlacementSchema,
  EventItemSchema,
  VideoItemSchema,
  FoodEntrySchema,
  WeeklyLineSchema,
  LimbSizeSchema,
  PerspectiveBandSchema,
  ObstetraNoteSchema,
  InsightTemplateSchema,
  FaqEntrySchema,
  BabyNameSchema,
  PriceEntrySchema,
  validateContentArray,
} from "../lib/content/schemas.ts";

// G1 content ops (BUILD-PLAN.md): `npm run validate:content` runs the same
// zod schemas that lib/seed/*.ts run at import time, over every hand-authored
// JSON content file, and prints one readable line per problem — file, entry,
// field, plain-Spanish reason — so a non-developer editing content (or a
// founder pasting in Gemini-generated entries) can fix it without touching
// TypeScript. Wired into .github/workflows/ci.yml.

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(repoRoot + relativePath, "utf8"));
}

type Check = { errors: string[] };

const checks: Check[] = [];

{
  const raw = readJson("lib/seed/articles.json") as unknown[];
  checks.push(
    validateContentArray("lib/seed/articles.json", raw, ArticleSchema, (a) => a.slug),
  );
}
{
  const raw = readJson("lib/seed/videos.json") as unknown[];
  checks.push(validateContentArray("lib/seed/videos.json", raw, VideoItemSchema));
}
{
  const raw = readJson("lib/seed/events.json") as unknown[];
  checks.push(validateContentArray("lib/seed/events.json", raw, EventItemSchema));
}
{
  const raw = (readJson("lib/seed/directory.json") as { listings: unknown[] }).listings;
  checks.push(
    validateContentArray("lib/seed/directory.json", raw, DirectoryListingSchema),
  );
}
{
  const raw = (readJson("lib/seed/placements.json") as { placements: unknown[] })
    .placements;
  checks.push(validateContentArray("lib/seed/placements.json", raw, AdPlacementSchema));
}
{
  // C2 weekly one-liner. Keyed by week rather than by id, so the duplicate
  // check catches "two entries for semana 24" — the failure mode of a file
  // that is edited a week at a time.
  try {
    const raw = readJson("lib/seed/weeklyLines.json") as unknown[];
    checks.push(
      validateContentArray(
        "lib/seed/weeklyLines.json",
        raw,
        WeeklyLineSchema,
        (entry) => String(entry.week),
      ),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // Not created yet — the app falls back to showing no line at all.
  }
}
{
  // C3 foot/hand sizes. Keyed by week: this file is edited a week at a time,
  // so the duplicate worth catching is "two entries for semana 24".
  try {
    const raw = readJson("lib/seed/limbSizes.json") as unknown[];
    checks.push(
      validateContentArray(
        "lib/seed/limbSizes.json",
        raw,
        LimbSizeSchema,
        (entry) => String(entry.week),
      ),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // Not created yet — the card falls back to the single "tamaño" tab.
  }
}
{
  // C4 perspective bands. Keyed by the range itself, so two identical ranges
  // are a duplicate while a narrower override of a wider band is not.
  try {
    const raw = readJson("lib/seed/perspectives.json") as unknown[];
    checks.push(
      validateContentArray(
        "lib/seed/perspectives.json",
        raw,
        PerspectiveBandSchema,
        (band) => `${band.fromWeek}-${band.toWeek}`,
      ),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // Not created yet — the switcher does not render at all.
  }
}
{
  // C5 "de la obstetra" notes, keyed by week.
  try {
    const raw = readJson("lib/seed/obstetraNotes.json") as unknown[];
    checks.push(
      validateContentArray(
        "lib/seed/obstetraNotes.json",
        raw,
        ObstetraNoteSchema,
        (entry) => String(entry.week),
      ),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // Not created yet — the card does not render.
  }
}
{
  // K9/F3 insight sentences, keyed by template id. Every line here is copy a
  // medical reviewer signs off on before the card can render at all.
  try {
    const raw = readJson("lib/seed/insights.json") as unknown[];
    checks.push(
      validateContentArray("lib/seed/insights.json", raw, InsightTemplateSchema),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // Not created yet — the card does not render.
  }
}
{
  // E6 FAQ.
  try {
    const raw = readJson("lib/seed/faq.json") as unknown[];
    checks.push(validateContentArray("lib/seed/faq.json", raw, FaqEntrySchema));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // Not created yet — the accordion renders nothing.
  }
}
{
  // D2 name picker. Keyed by the name itself — the same name twice is the
  // failure mode of a list that grows by pasting.
  try {
    const raw = readJson("lib/seed/names.json") as unknown[];
    checks.push(
      validateContentArray("lib/seed/names.json", raw, BabyNameSchema, (n) => n.name),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // Not created yet — the picker shows its empty state.
  }
}
{
  // D3 food lookup — validated the same way as everything else.
  try {
    const raw = readJson("lib/seed/food.json") as unknown[];
    checks.push(validateContentArray("lib/seed/food.json", raw, FoodEntrySchema));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // food.json not created yet (pre-D3) — nothing to validate.
  }
}

{
  // K10 price guide — same pipeline as D3.
  const raw = readJson("lib/seed/prices.json") as unknown[];
  checks.push(validateContentArray("lib/seed/prices.json", raw, PriceEntrySchema));
}

// Extra guard for "timestamps computed at module load" (BUILD-PLAN G1): a
// seed .ts file should never call Date.now() to derive content dates —
// content dates belong in the JSON as fixed epoch-millisecond numbers.
{
  const { readdirSync } = await import("node:fs");
  const seedDir = repoRoot + "lib/seed/";
  const offenders: string[] = [];
  for (const name of readdirSync(seedDir)) {
    if (!name.endsWith(".ts") || name.endsWith(".test.ts")) continue;
    const contents = readFileSync(seedDir + name, "utf8")
      // Strip comments first so a line *describing* this rule (like the one
      // in this very file) doesn't trip it — only actual code counts.
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    if (/Date\.now\(\)|new Date\(\)/.test(contents)) {
      offenders.push(`lib/seed/${name}`);
    }
  }
  if (offenders.length > 0) {
    checks.push({
      errors: offenders.map(
        (file) =>
          `${file}: calcula una fecha con Date.now()/new Date() al cargar el módulo — las fechas de contenido tienen que ser un número fijo (epoch ms) en el JSON, no calcularse en código`,
      ),
    });
  }
}

const allErrors = checks.flatMap((c) => c.errors);

if (allErrors.length > 0) {
  console.error(`\n✗ ${allErrors.length} problema(s) de contenido encontrados:\n`);
  for (const line of allErrors) {
    console.error(`  - ${line}`);
  }
  console.error("\nCorregí el archivo JSON indicado y volvé a correr `npm run validate:content`.\n");
  process.exit(1);
}

const totalEntries = checks.length;
console.log(`✓ Contenido válido (${totalEntries} archivo(s) revisados, sin errores).`);
