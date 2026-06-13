// Generates the PWA icons as PNGs with no external deps (zlib + manual PNG).
// Run with: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

// Palette (build spec §3).
const CREAM = [0xfb, 0xf7, 0xf1];
const PETROL = [0x1f, 0x5f, 0x5b];
const TERRACOTTA = [0xd9, 0x71, 0x4b];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function renderPng(size, maskable) {
  const px = (x, y) => {
    const cx = size / 2;
    const cy = size / 2;
    // Background: cream, or petrol full-bleed for maskable safe area.
    let color = maskable ? PETROL : CREAM;
    const r = size * (maskable ? 0.5 : 0.34);
    const d = Math.hypot(x - cx, y - cy);
    if (!maskable && d <= r) color = PETROL;
    // Terracotta "egg" dot, slightly above center.
    const dotR = size * 0.12;
    const dotY = cy - size * 0.06;
    if (Math.hypot(x - cx, y - dotY) <= dotR) color = TERRACOTTA;
    return color;
  };

  const raw = Buffer.alloc((size * 4 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = px(x, y);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
      raw[o++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(join(OUT, "icon-192.png"), renderPng(192, false));
writeFileSync(join(OUT, "icon-512.png"), renderPng(512, false));
writeFileSync(join(OUT, "icon-maskable-512.png"), renderPng(512, true));
console.log("Icons written to public/icons/");
