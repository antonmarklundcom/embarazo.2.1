// Growth plan item 15 — place the "Ejercicios" step images once they exist.
//
//   node scripts/place-exercise-art.mjs [source-dir]
//
// Drop one image per step into the source dir (default
// public/assets/ejercicios/src/, git-ignored), named exactly like the target
// without extension: `caminar-1.png`, `gato-vaca-2.jpg`… (PNG, JPG or WebP; the
// full list is in public/assets/ejercicios/README.md). For every step that has
// a source, this script:
//
//   1. crops to 4:3 around the centre and resizes to 960×720 (the screen shows
//      it at up to 480 px wide; 960 covers a 2× phone),
//   2. encodes WebP, stepping quality down until the file is under 90 KB,
//   3. writes public/assets/ejercicios/<id>-<n>.webp,
//   4. points that step's `imageSrc` in lib/seed/ejercicios.json at it.
//
// Steps without a source keep "placeholder", so an exercise appears in the app
// only when ALL its steps have a real image (the rule lib/seed/gate.ts already
// applies). Nothing is generated here: this only places files a person made.
// Run `npm run validate:content` afterwards; it fails on any imageSrc that is
// neither a placeholder nor a file on disk.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = join(ROOT, "lib", "seed", "ejercicios.json");
const OUT_DIR = join(ROOT, "public", "assets", "ejercicios");
const SRC_DIR = process.argv[2] ? resolve(process.argv[2]) : join(OUT_DIR, "src");
const WIDTH = 960;
const HEIGHT = 720;
const BUDGET_BYTES = 90 * 1024;
const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function sourceFor(stem) {
  for (const ext of EXTENSIONS) {
    const file = join(SRC_DIR, stem + ext);
    if (existsSync(file)) return file;
  }
  return null;
}

async function encode(file) {
  const base = sharp(file).rotate().resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" });
  for (let quality = 82; quality >= 50; quality -= 8) {
    const buffer = await base.clone().webp({ quality }).toBuffer();
    if (buffer.length <= BUDGET_BYTES || quality <= 50) return { buffer, quality };
  }
  throw new Error("unreachable");
}

// The seed is edited in place, one `imageSrc` value at a time, anchored on the
// step's own text: re-serialising the whole file would reflow its hand-kept
// formatting (short arrays on one line) and bury the real change in a diff.
let raw = readFileSync(SEED, "utf8");
const exercises = JSON.parse(raw);

function pointAt(stepText, oldSrc, newSrc) {
  const escape = (value) => JSON.stringify(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${escape(stepText)},\\s*"imageSrc":\\s*)${escape(oldSrc)}`);
  if (!pattern.test(raw)) throw new Error(`No encontré el paso "${stepText}" en ejercicios.json`);
  raw = raw.replace(pattern, `$1${JSON.stringify(newSrc)}`);
}
let placed = 0;
const missing = [];
for (const exercise of exercises) {
  for (const [index, step] of exercise.steps.entries()) {
    const stem = `${exercise.id}-${index + 1}`;
    const source = sourceFor(stem);
    if (!source) {
      if (step.imageSrc.includes("placeholder")) missing.push(stem);
      continue;
    }
    const { buffer, quality } = await encode(source);
    writeFileSync(join(OUT_DIR, `${stem}.webp`), buffer);
    const target = `/assets/ejercicios/${stem}.webp`;
    if (step.imageSrc !== target) pointAt(step.text, step.imageSrc, target);
    step.imageSrc = target;
    placed += 1;
    console.log(`✓ ${stem}.webp  ${Math.round(buffer.length / 1024)} KB  q${quality}`);
  }
}
writeFileSync(SEED, raw);

const complete = exercises.filter((e) => e.steps.every((s) => !s.imageSrc.includes("placeholder")));
console.log(`\n${placed} imágenes colocadas. Ejercicios completos (visibles en la app): ${complete.length}/${exercises.length}.`);
if (missing.length > 0) console.log(`Faltan: ${missing.join(", ")}`);
