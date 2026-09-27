// Copy the site's 42 week illustrations into the app's hero slot.
//
//   site  assets/img/tamano-bebe-semana-<n>-<fruit>-640.webp   (embarazo.com.py)
//   app   public/assets/semanas/bebe-<n>.webp                   (WeekHeroImage, HeroSubject)
//
// Usage (from the repo root, with the site checked out next to this repo):
//   node scripts/import-site-week-art.mjs [path-to-site-checkout]
//   git add public/assets/semanas/*.webp
//
// The site path defaults to ../embarazo. The 640 px WebP is copied byte for
// byte — it is already the size and format the app serves (the card shows it
// at 200 px, the home ring at ~160 px, so 640 covers a 3× screen). The app's
// filename contract is kept, so no component learns the site's slugs.
//
// These are OPAQUE illustrations (fruit or calendar on a flat pastel ground),
// not the transparent cutouts the U7 layout composites — `lib/hero/weekArt.ts`
// is the switch that tells the hero which kind is on disk.

import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = resolve(process.argv[2] ?? join(ROOT, "..", "embarazo"));
const srcDir = join(site, "assets", "img");
const outDir = join(ROOT, "public", "assets", "semanas");

let names;
try {
  names = readdirSync(srcDir);
} catch {
  console.error(`No encuentro ${srcDir}. Pasá la ruta del sitio: node scripts/import-site-week-art.mjs ../embarazo`);
  process.exit(1);
}

const byWeek = new Map();
for (const name of names) {
  const m = /^tamano-bebe-semana-(\d{1,2})-[a-z0-9-]+-640\.webp$/.exec(name);
  if (!m) continue;
  const week = Number(m[1]);
  if (byWeek.has(week)) {
    console.error(`Semana ${week} tiene dos archivos: ${byWeek.get(week)} y ${name}`);
    process.exit(1);
  }
  byWeek.set(week, name);
}

const missing = [];
for (let week = 1; week <= 42; week++) if (!byWeek.has(week)) missing.push(week);
if (missing.length > 0) {
  console.error(`Faltan semanas en el sitio: ${missing.join(", ")}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
let bytes = 0;
for (let week = 1; week <= 42; week++) {
  const from = join(srcDir, byWeek.get(week));
  const to = join(outDir, `bebe-${week}.webp`);
  copyFileSync(from, to);
  bytes += statSync(to).size;
}
console.log(`✓ 42 ilustraciones → public/assets/semanas/ (${Math.round(bytes / 1024)} KB en total)`);
