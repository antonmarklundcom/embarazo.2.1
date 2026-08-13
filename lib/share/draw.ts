import { CARD_HEIGHT, CARD_WIDTH, type ShareCardContent } from "./card";

// BUILD-PLAN E2 — the drawing, on device.
//
// Everything here runs on a `<canvas>` in the user's browser. There is no
// server round-trip, no upload and no third-party renderer: a bump photo is
// read from IndexedDB, composited locally, and handed to `navigator.share` as
// a file the user then chooses what to do with. `share.test.ts` asserts this
// module contains no `fetch`, no `XMLHttpRequest` and no URL of ours.
//
// The palette is the app's, written out here as literals because a canvas
// cannot read a Tailwind class. If the tokens change, these change with them.

const CREAM = "#FBF7F1";
const INK = "#322E29";
const ROSA = "#F3D9DC";
const ARENA = "#EFE0CE";
const PETROL = "#3C6E71";

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

/** The frame, the wordmark and the week — everything except the photo. */
function drawChrome(ctx: CanvasRenderingContext2D, content: ShareCardContent): void {
  ctx.fillStyle = INK;
  ctx.textAlign = "center";

  ctx.font = "700 44px system-ui, sans-serif";
  ctx.fillStyle = PETROL;
  ctx.fillText(content.tagline, CARD_WIDTH / 2, CARD_HEIGHT - 190);

  ctx.font = "900 96px system-ui, sans-serif";
  ctx.fillStyle = INK;
  ctx.fillText(`Semana ${content.week}`, CARD_WIDTH / 2, CARD_HEIGHT - 100);

  ctx.font = "800 36px system-ui, sans-serif";
  ctx.fillStyle = PETROL;
  ctx.fillText(content.brand.toUpperCase(), CARD_WIDTH / 2, CARD_HEIGHT - 40);
}

/** The week card: no photo, nothing personal, just the number. */
export function drawWeekCard(
  ctx: CanvasRenderingContext2D,
  content: ShareCardContent,
): void {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = ROSA;
  roundedRect(ctx, 90, 150, CARD_WIDTH - 180, 780, 72);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = "900 340px system-ui, sans-serif";
  ctx.fillText(String(content.week), CARD_WIDTH / 2, 620);
  ctx.font = "800 56px system-ui, sans-serif";
  ctx.fillText("semanas", CARD_WIDTH / 2, 720);

  drawChrome(ctx, content);
}

/**
 * The bump frame: the user's photo, cropped to fill, inside the same frame.
 *
 * `cover` maths rather than a stretch — a squashed bump photo is the kind of
 * detail that makes somebody not share it.
 */
export function drawBumpFrame(
  ctx: CanvasRenderingContext2D,
  content: ShareCardContent,
  photo: CanvasImageSource & { width: number; height: number },
): void {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const frameX = 90;
  const frameY = 120;
  const frameW = CARD_WIDTH - 180;
  const frameH = 900;

  ctx.save();
  roundedRect(ctx, frameX, frameY, frameW, frameH, 72);
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

  ctx.strokeStyle = ARENA;
  ctx.lineWidth = 10;
  roundedRect(ctx, frameX, frameY, frameW, frameH, 72);
  ctx.stroke();

  drawChrome(ctx, content);
}
