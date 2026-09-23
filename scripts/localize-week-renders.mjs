// Download the renders listed in docs/imagery-manifest.json and turn them into
// the committed WebPs the app already looks for:
//
//   images[]      → public/assets/semanas/bebe-<week>.webp   (WeekHeroImage)
//   comparisons[] → public/assets/comparaciones/<slug>.webp  (ComparisonFigure)
//
// Usage (from the repo root):
//   npm run localize:images
//   git add public/assets/semanas/*.webp public/assets/comparaciones/*.webp docs/imagery-manifest.json
//
// The PNG sources land in each folder's src/ (ignored by git) and are
// converted by scripts/optimize-images.mjs, which keeps the transparency the
// themes depend on. Nothing is generated here: it only fetches what the
// manifest already paid for.
//
// In a Claude Code cloud session the download needs `*.cloudfront.net` on the
// environment's allowed domains; without it every fetch fails with a 403 from
// the proxy, and this script says so and exits non-zero.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(ROOT, "docs", "imagery-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

// `file` is the committed WebP; its PNG source sits in a `src/` beside it.
const entries = [...(manifest.images ?? []), ...(manifest.comparisons ?? [])];
const outDirs = new Set();

let failed = 0;
for (const entry of entries) {
  const outDir = dirname(entry.file);
  const target = join(ROOT, outDir, "src", basename(entry.file, ".webp") + ".png");
  mkdirSync(dirname(target), { recursive: true });
  try {
    const res = await fetch(entry.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(target, Buffer.from(await res.arrayBuffer()));
    outDirs.add(outDir);
    console.log(`✓ ${entry.id}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${entry.id}: ${error.message}`);
  }
}

if (failed > 0) {
  console.error(
    `\n${failed} de ${entries.length} no se pudieron bajar. En una sesión en la nube, ` +
      "agregá *.cloudfront.net a los dominios permitidos del entorno y volvé a correr esto.",
  );
  process.exit(1);
}

// optimize-images.mjs resolves its arguments against the cwd and writes
// relative to the source root, so pass the out dir explicitly: without it
// `semanas/src/bebe-3.png` would land at public/assets/bebe-3.webp.
for (const outDir of outDirs) {
  execFileSync(
    process.execPath,
    [join(ROOT, "scripts", "optimize-images.mjs"), join(outDir, "src"), outDir],
    { cwd: ROOT, stdio: "inherit" },
  );
}

manifest._notes.download_status = `localized ${new Date().toISOString().slice(0, 10)}`;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");
console.log(`\nListo: ${[...outDirs].map((d) => `${d}/*.webp`).join(", ")}`);
