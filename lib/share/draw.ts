import {
  CARD_HEIGHT,
  CARD_WIDTH,
  shareEyebrow,
  shareHeadline,
  type ShareCardContent,
} from "./card";

// BUILD-PLAN E2 — the drawing, on device.
//
// Everything here runs on a `<canvas>` in the user's browser. There is no
// server round-trip, no upload and no third-party renderer: a bump photo is
// read from IndexedDB, composited locally, and handed to `navigator.share` as
// a file the user then chooses what to do with. `share.test.ts` asserts this
// module contains no `fetch`, no `XMLHttpRequest` and no URL of ours.
//
// Share card v2 — the redesign. The first card was a pink rectangle with a
// giant number, which is honest and which nobody posts. What gets posted to a
// WhatsApp status is something that looks like it was made *for* this week: so
// the ground is the trimester's own pastel (the same three the week hero uses),
// behind the baby sits a ñandutí medallion — the lace structure
// `components/hero/ThemeBackdrop.tsx` draws as SVG, redrawn here with canvas
// strokes — and in the middle is a small flat illustration of a curled baby,
// with the size line under it. Everything is drawn in code: no image assets to
// fetch, cache or keep in sync, and nothing that could be anything but the
// week's own content.
//
// The palette is the app's, written out here as literals because a canvas
// cannot read a Tailwind class. If the tokens in `app/globals.css` change,
// these change with them.

const INK = "#322E29";
const PETROL = "#2F5D50";
const TERRACOTTA = "#B5553A";
const WHITE = "#FFFFFF";

/** Trimester grounds: pastel-salvia, pastel-celeste, pastel-rosa. */
const TRIMESTER_GROUND: Record<1 | 2 | 3, string> = {
  1: "#DFE8D8",
  2: "#D9E5EC",
  3: "#F3DAD4",
};

// The illustration's own skin tones. Warm and flat on purpose: a realistic
// fetus on a status post reads as a scan, and a scan is medical.
const SKIN_BODY = "#EFC6B0";
const SKIN_LIMB = "#F2CDB9";
const SKIN_HEAD = "#F4D3C2";
const CHEEK = "#F3DAD4";

/**
 * The embryo stage. Before week 9 there is no baby shape worth drawing — a
 * curled baby at week 6 would be a cute lie — so those weeks get a soft glow
 * instead, the "something is starting" image rather than a figure.
 */
const FIRST_BABY_WEEK = 9;

const SANS = "system-ui, sans-serif";
const CENTER_X = CARD_WIDTH / 2;

function font(heavy: number, size: number): string {
  return `${heavy} ${size}px ${SANS}`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * Sets the largest font (down to `min`) at which `text` fits in `maxWidth`.
 * "¡Semana 40!" is wider than "¡Semana 9!", and a headline that runs off the
 * edge of a status post is the one flaw everybody notices.
 */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  heavy: number,
  size: number,
  min: number,
  maxWidth: number,
): void {
  let current = size;
  ctx.font = font(heavy, current);
  while (current > min && ctx.measureText(text).width > maxWidth) {
    current -= 4;
    ctx.font = font(heavy, current);
  }
}

/**
 * One line if it fits, else two lines of balanced width. The longest size line
 * in `lib/weeks.ts` ("Del tamaño de una sandía grande y madura") does not fit
 * on one line at a readable size, and shrinking it until it did would make
 * week 42's card look quieter than week 20's. Balanced rather than greedy so
 * the break never leaves one orphaned word on the second line.
 */
function balancedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(" ");
  let best: string[] = [text];
  let bestWidth = Infinity;
  for (let i = 1; i < words.length; i++) {
    const first = words.slice(0, i).join(" ");
    const second = words.slice(i).join(" ");
    const widest = Math.max(ctx.measureText(first).width, ctx.measureText(second).width);
    if (widest < bestWidth) {
      bestWidth = widest;
      best = [first, second];
    }
  }
  return best;
}

/**
 * Ñandutí — Paraguay's radial lace: concentric rings, sixteen spokes and a
 * bead where each spoke crosses the gap between two rings. White at half
 * opacity, so on any of the three pastels it reads as texture, not as a shape
 * competing with the baby.
 */
function drawNanduti(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const rings = [0.3, 0.48, 0.66, 0.84].map((f) => f * radius);
  const beads = [0.39, 0.57, 0.75, 0.92].map((f) => f * radius);
  const spokes = 16;

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = WHITE;
  ctx.fillStyle = WHITE;
  ctx.lineWidth = 3;

  for (const r of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < spokes; i++) {
    const angle = (i * Math.PI * 2) / spokes;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cx + cos * rings[0]!, cy + sin * rings[0]!);
    ctx.lineTo(cx + cos * radius, cy + sin * radius);
    ctx.stroke();

    for (const r of beads) {
      ctx.beginPath();
      ctx.arc(cx + cos * r, cy + sin * r, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // A scallop between neighbouring spokes on the outer ring — the petal
    // edge that makes lace read as lace rather than as a dartboard.
    const next = ((i + 1) * Math.PI * 2) / spokes;
    const mid = (angle + next) / 2;
    ctx.beginPath();
    ctx.moveTo(cx + cos * radius, cy + sin * radius);
    ctx.quadraticCurveTo(
      cx + Math.cos(mid) * radius * 1.07,
      cy + Math.sin(mid) * radius * 1.07,
      cx + Math.cos(next) * radius,
      cy + Math.sin(next) * radius,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The curled baby — a flat illustration drawn from SVG path data in a 200×200
 * box, scaled so the figure is `width` pixels across and centred on (cx, cy).
 * Path2D keeps the shapes as data, so the drawing stays a few lines of fills
 * and strokes rather than a bitmap to load.
 */
function drawBaby(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
): void {
  // 118 = the figure's width inside the 200 box (x 34–152).
  const scale = width / 118;
  // The figure's own bounding box inside the 200 box is x 34–152, y 34–162;
  // its centre (93, 98) is what lands on (cx, cy).
  ctx.save();
  ctx.translate(cx - 93 * scale, cy - 98 * scale);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = PETROL;
  ctx.lineWidth = 2.2;

  const body = new Path2D(
    "M62 150 C34 136 36 92 66 80 C92 70 128 76 140 102 C152 132 130 162 100 162 C86 162 72 158 62 150 Z",
  );
  ctx.fillStyle = SKIN_BODY;
  ctx.fill(body);
  ctx.stroke(body);

  ctx.beginPath();
  ctx.arc(120, 136, 21, 0, Math.PI * 2);
  ctx.fillStyle = SKIN_LIMB;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(96, 150, 15, 8, (-18 * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fillStyle = SKIN_LIMB;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(88, 70, 36, 0, Math.PI * 2);
  ctx.fillStyle = SKIN_HEAD;
  ctx.fill();
  ctx.stroke();

  ctx.stroke(new Path2D("M76 72 Q82 77 88 72"));

  ctx.beginPath();
  ctx.arc(74, 84, 6, 0, Math.PI * 2);
  ctx.fillStyle = CHEEK;
  ctx.fill();

  ctx.stroke(new Path2D("M58 76 Q52 80 57 86"));

  ctx.beginPath();
  ctx.ellipse(104, 100, 10, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = SKIN_HEAD;
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/** A four-point sparkle, terracotta at partial opacity. */
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  const pinch = r * 0.22;
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = TERRACOTTA;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + pinch, y - pinch, x + r, y);
  ctx.quadraticCurveTo(x + pinch, y + pinch, x, y + r);
  ctx.quadraticCurveTo(x - pinch, y + pinch, x - r, y);
  ctx.quadraticCurveTo(x - pinch, y - pinch, x, y - r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Weeks 1–8: a soft warm glow with a small core that grows with the week. */
function drawGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  week: number,
): void {
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 230);
  halo.addColorStop(0, "rgba(251, 231, 220, 0.95)");
  halo.addColorStop(0.4, "rgba(251, 231, 220, 0.6)");
  halo.addColorStop(1, "rgba(251, 231, 220, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, 230, 0, Math.PI * 2);
  ctx.fill();

  const core = 30 + Math.max(1, Math.min(week, 8)) * 5;
  const warm = ctx.createRadialGradient(cx, cy - core * 0.3, core * 0.1, cx, cy, core);
  warm.addColorStop(0, "#FBE7DC");
  warm.addColorStop(1, SKIN_BODY);
  ctx.fillStyle = warm;
  ctx.beginPath();
  ctx.arc(cx, cy, core, 0, Math.PI * 2);
  ctx.fill();
}

/** The header both cards share: spaced-capitals eyebrow, then "¡Semana N!". */
function drawHeader(
  ctx: CanvasRenderingContext2D,
  content: ShareCardContent,
  eyebrowY: number,
  headlineY: number,
  headlineSize: number,
): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const eyebrow = shareEyebrow(content);
  ctx.letterSpacing = "6px";
  fitFont(ctx, eyebrow, 800, 36, 26, CARD_WIDTH - 200);
  ctx.fillStyle = content.milestone ? TERRACOTTA : PETROL;
  ctx.fillText(eyebrow, CENTER_X, eyebrowY);
  ctx.letterSpacing = "0px";

  const headline = shareHeadline(content);
  fitFont(ctx, headline, 900, headlineSize, 80, CARD_WIDTH - 160);
  ctx.fillStyle = INK;
  ctx.fillText(headline, CENTER_X, headlineY);
}

/** The footer pill: "Mi Bebé · embarazo.com.py", white on petrol. */
function drawFooterPill(
  ctx: CanvasRenderingContext2D,
  content: ShareCardContent,
  centerY: number,
): void {
  const label = `${content.brand} · ${content.site}`;
  ctx.font = font(800, 34);
  const width = ctx.measureText(label).width + 104;
  const height = 84;

  ctx.fillStyle = PETROL;
  roundedRect(ctx, CENTER_X - width / 2, centerY - height / 2, width, height, height / 2);
  ctx.fill();

  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, CENTER_X, centerY + 2);
  ctx.textBaseline = "alphabetic";
}

/** The trimester ground, edge to edge. */
function drawGround(ctx: CanvasRenderingContext2D, content: ShareCardContent): void {
  ctx.fillStyle = TRIMESTER_GROUND[content.trimester];
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
}

/**
 * The week card: the week, its size and a baby — nothing personal.
 *
 * Vertical rhythm on the 1350px canvas: header in the top fifth, the medallion
 * and figure in the middle half, the size line and the pill at the foot, with
 * the medallion's outer ring kept clear of both text blocks.
 */
export function drawWeekCard(
  ctx: CanvasRenderingContext2D,
  content: ShareCardContent,
): void {
  drawGround(ctx, content);
  drawHeader(ctx, content, 136, 276, 128);

  const artY = 652;
  const lace = 292;
  drawNanduti(ctx, CENTER_X, artY, lace);

  // A soft white disc under the figure lifts it off the pastel. Its edge sits
  // exactly on the lace's outer ring so the two read as one line, not two.
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(CENTER_X, artY, lace * 0.84, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Three small terracotta sparkles outside the lace: the "this is a
  // celebration" note, placed clear of both text blocks.
  drawSparkle(ctx, 878, 396, 22);
  drawSparkle(ctx, 204, 512, 14);
  drawSparkle(ctx, 858, 906, 12);

  if (content.week >= FIRST_BABY_WEEK) {
    // The figure grows a little across the pregnancy — 290px across at week 9
    // to 350px at 40 — so a week-35 card does not look like a week-10 one.
    const growth = Math.min(1, Math.max(0, (content.week - FIRST_BABY_WEEK) / 31));
    drawBaby(ctx, CENTER_X + 6, artY + 4, 290 + 60 * growth);
  } else {
    drawGlow(ctx, CENTER_X, artY, content.week);
  }

  // The size line — or, for the weeks that have no size yet, the tagline,
  // quieter and on one line, since it is the app talking rather than the week.
  ctx.textAlign = "center";
  if (content.size) {
    ctx.fillStyle = INK;
    // Shrink a little before breaking: "Del tamaño de una aceituna" reads
    // better on one line at 52px than on two at 58px. Only the genuinely long
    // ones wrap, at full size.
    const maxWidth = CARD_WIDTH - 180;
    fitFont(ctx, content.size, 800, 58, 50, maxWidth);
    if (ctx.measureText(content.size).width > maxWidth) ctx.font = font(800, 58);
    const lines = balancedLines(ctx, content.size, maxWidth);
    const firstY = lines.length === 1 ? 1072 : 1040;
    lines.forEach((line, i) => ctx.fillText(line, CENTER_X, firstY + i * 70));
  } else {
    ctx.fillStyle = PETROL;
    fitFont(ctx, content.tagline, 800, 52, 36, CARD_WIDTH - 200);
    ctx.fillText(content.tagline, CENTER_X, 1072);
  }

  drawFooterPill(ctx, content, 1214);
}

/**
 * The bump frame: the user's photo, cropped to fill, on the same ground and
 * under the same header as the week card.
 *
 * `cover` maths rather than a stretch — a squashed bump photo is the kind of
 * detail that makes somebody not share it.
 */
export function drawBumpFrame(
  ctx: CanvasRenderingContext2D,
  content: ShareCardContent,
  photo: CanvasImageSource & { width: number; height: number },
): void {
  drawGround(ctx, content);

  const frameX = 110;
  const frameY = 300;
  const frameW = CARD_WIDTH - 220;
  const frameH = 750;

  // The lace peeks out either side of the photo. Clipped to the photo's own
  // band so its rings never run behind the headline or the caption, where
  // they would read as strike-through rather than as lace; at that band's
  // edges the rings are already behind the photo, so the cut never shows.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, frameY, CARD_WIDTH, frameH);
  ctx.clip();
  drawNanduti(ctx, CENTER_X, frameY + frameH / 2, 500);
  ctx.restore();

  drawHeader(ctx, content, 112, 230, 116);

  ctx.save();
  roundedRect(ctx, frameX, frameY, frameW, frameH, 56);
  ctx.clip();
  const scale = Math.max(frameW / photo.width, frameH / photo.height);
  const drawW = photo.width * scale;
  const drawH = photo.height * scale;
  ctx.drawImage(
    photo,
    frameX + (frameW - drawW) / 2,
    frameY + (frameH - drawH) / 2,
    drawW,
    drawH,
  );
  ctx.restore();

  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 14;
  roundedRect(ctx, frameX, frameY, frameW, frameH, 56);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = PETROL;
  ctx.font = font(800, 44);
  ctx.fillText(content.tagline, CENTER_X, 1140);

  drawFooterPill(ctx, content, 1230);
}
