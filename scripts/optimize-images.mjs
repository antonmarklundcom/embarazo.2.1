// Optimize source images into web-ready WebP for public/assets.
// Usage:
//   npm i -D sharp            (one time)
//   node scripts/optimize-images.mjs <src-dir-or-file> [out-dir]
//
// Defaults: reads public/assets/_src/**, writes alongside in public/assets
// preserving subfolder + slug, resized to max 800px, WebP q78, target ≤60 KB.
// See docs/REDESIGN-PLAN.md §4 for the naming convention:
//   public/assets/semanas/bebe-<week>.webp
//   public/assets/articulos/<slug>.webp
//   public/assets/hero/<name>.webp

import { readdirSync, statSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, extname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_SRC = join(ROOT, "public", "assets", "_src");
const ASSETS = join(ROOT, "public", "assets");

const MAX_DIM = 800;
const QUALITY = 78;
const TARGET_BYTES = 60 * 1024;

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error(
    "\n  sharp is not installed. Run:  npm i -D sharp\n  Then re-run this script.\n",
  );
  process.exit(1);
}

const srcArg = process.argv[2] ? join(process.cwd(), process.argv[2]) : DEFAULT_SRC;
const outArg = process.argv[3] ? join(process.cwd(), process.argv[3]) : null;

if (!existsSync(srcArg)) {
  console.error(`  Source not found: ${srcArg}`);
  console.error(`  Put source images in public/assets/_src/ or pass a path.`);
  process.exit(1);
}

const IMG_RE = /\.(png|jpe?g|webp|avif|tiff?)$/i;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (IMG_RE.test(name)) out.push(p);
  }
  return out;
}

const files = statSync(srcArg).isDirectory() ? walk(srcArg) : [srcArg];
if (files.length === 0) {
  console.log("  No images found.");
  process.exit(0);
}

let total = 0;
for (const file of files) {
  // Preserve subfolder structure relative to the source root; drop _src.
  const rel = statSync(srcArg).isDirectory() ? relative(srcArg, file) : basename(file);
  const slug = join(dirname(rel), basename(rel, extname(rel)) + ".webp");
  const outPath = outArg ? join(outArg, slug) : join(ASSETS, slug);
  mkdirSync(dirname(outPath), { recursive: true });

  // Try descending quality until under the size budget.
  let q = QUALITY;
  let info;
  do {
    info = await sharp(file)
      .rotate()
      .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: q })
      .toFile(outPath);
    q -= 8;
  } while (info.size > TARGET_BYTES && q >= 40);

  total += info.size;
  const kb = (info.size / 1024).toFixed(0);
  const flag = info.size > TARGET_BYTES ? "  ⚠ over budget" : "";
  console.log(`  ${slug}  ${kb} KB${flag}`);
}

console.log(`\n  ${files.length} images · ${(total / 1024).toFixed(0)} KB total`);
