// Generates a branded default OG/social share image with no external deps
// (zlib + manual PNG), same technique as gen-icons.mjs. Placeholder art
// (P1.4, BUILD-PLAN.md) — replace with real branding/photography once
// available; per-guía dynamic OG can layer text on top later via next/og.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public");
mkdirSync(OUT, { recursive: true });

// Palette (docs/REDESIGN-PLAN.md §1).
const CREAM = [0xfb, 0xf7, 0xf1];
const ARENA = [0xf8, 0xe2, 0xcb];
const PETROL = [0x2f, 0x5d, 0x50];
const TERRACOTTA = [0xc9, 0x63, 0x42];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

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

const W = 1200;
const H = 630;

function px(x, y) {
  // Diagonal gradient background: cream -> arena, mirroring the hero card.
  const t = (x / W + y / H) / 2;
  let color = mix(CREAM, ARENA, t);

  // Brand mark: petrol circle with a terracotta "egg" dot, left-of-center.
  const cx = W * 0.32;
  const cy = H * 0.5;
  const r = H * 0.28;
  const d = Math.hypot(x - cx, y - cy);
  if (d <= r) color = PETROL;
  const dotR = H * 0.09;
  const dotY = cy - H * 0.05;
  if (Math.hypot(x - cx, y - dotY) <= dotR) color = TERRACOTTA;

  // Accent bar, bottom edge.
  if (y >= H - 14) color = TERRACOTTA;

  return color;
}

const raw = Buffer.alloc((W * 4 + 1) * H);
let o = 0;
for (let y = 0; y < H; y++) {
  raw[o++] = 0; // filter: none
  for (let x = 0; x < W; x++) {
    const [r, g, b] = px(x, y);
    raw[o++] = r;
    raw[o++] = g;
    raw[o++] = b;
    raw[o++] = 255;
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);

writeFileSync(join(OUT, "og.png"), png);
console.log("OG image written to public/og.png");
