import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

import { APP_NAME } from "@/lib/brand";
import { WEEKS } from "@/lib/weeks";
import { clampWeek } from "@/lib/pregnancy";
import { OG_IMAGE_SIZE, weekCardContent } from "@/lib/seo/openGraph";

// Item 7 — the week's share card: the same render the week page shows, its
// number and its size line, laid out from a template at build time. Nothing
// here is generated imagery; it is the existing `bebe-N.webp` composited.
//
// Satori (behind ImageResponse) cannot decode WebP, so the render is converted
// to PNG with sharp — hence the Node.js runtime. sharp reaches us through
// `next` (it is not a direct dependency), so it is loaded lazily and a missing
// or failing sharp degrades to the text-only card instead of a broken image.
// Fonts: `public/fonts` only has woff2, which Satori cannot read, so the card
// uses ImageResponse's bundled default font.

export const runtime = "nodejs";
export const alt = `${APP_NAME}: tu bebé semana a semana`;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

const PETROL = "#2F5D50";
const CREAM = "#FBF7F1";
const TERRACOTTA = "#C96342";

export function generateStaticParams() {
  return WEEKS.map((w) => ({ n: String(w.week) }));
}

async function weekArtDataUri(relativePath: string): Promise<string | null> {
  try {
    const webp = await readFile(path.join(process.cwd(), relativePath));
    const { default: sharp } = await import("sharp");
    const png = await sharp(webp).resize(520, 520, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function WeekOpenGraphImage({
  params,
}: {
  params: { n: string } | Promise<{ n: string }>;
}) {
  const { n } = await params;
  const week = clampWeek(Number(n));
  const card = weekCardContent(week);
  const art = card.artPath ? await weekArtDataUri(card.artPath) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: CREAM,
          padding: "0 70px",
          gap: 60,
        }}
      >
        {art && (
          <img
            src={art}
            width={490}
            height={490}
            alt=""
            style={{ borderRadius: 48, border: `6px solid ${PETROL}` }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: TERRACOTTA,
            }}
          >
            {APP_NAME}
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: art ? 88 : 140,
              fontWeight: 800,
              lineHeight: 1,
              color: PETROL,
            }}
          >
            {card.heading}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: art ? 44 : 56,
              lineHeight: 1.2,
              color: PETROL,
            }}
          >
            {card.size}
          </div>
          <div
            style={{
              marginTop: 36,
              width: 120,
              height: 10,
              borderRadius: 5,
              background: TERRACOTTA,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
