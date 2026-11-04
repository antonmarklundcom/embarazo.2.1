import { describe, expect, it } from "vitest";

import { APP_NAME } from "../brand";
import { DEFAULT_OG_IMAGE, pageSocialMetadata, weekCardContent } from "./openGraph";

describe("pageSocialMetadata", () => {
  it("sets every Open Graph field, since a page's openGraph replaces the root's", () => {
    const meta = pageSocialMetadata({
      title: "Guía · Mi Bebé",
      description: "Resumen",
      url: "/guias/x",
      images: [DEFAULT_OG_IMAGE],
    });
    expect(meta.openGraph).toEqual({
      type: "article",
      siteName: APP_NAME,
      locale: "es_PY",
      title: "Guía · Mi Bebé",
      description: "Resumen",
      url: "/guias/x",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: APP_NAME }],
    });
    expect(meta.twitter).toEqual({
      card: "summary_large_image",
      title: "Guía · Mi Bebé",
      description: "Resumen",
      images: ["/og.png"],
    });
  });

  it("leaves images unset so a file-convention opengraph-image applies", () => {
    const meta = pageSocialMetadata({ title: "Semana 12", description: "d", url: "https://site/semana/12/" });
    expect(meta.openGraph).not.toHaveProperty("images");
    expect(meta.twitter).not.toHaveProperty("images");
  });
});

describe("weekCardContent", () => {
  it("uses the week render and its size line when there is art", () => {
    const card = weekCardContent(12);
    expect(card.heading).toBe("Semana 12");
    expect(card.size).toMatch(/^Del tamaño de /);
    expect(card.artPath).toBe("public/assets/semanas/bebe-12.webp");
  });

  it("falls back to text only for weeks without art", () => {
    const card = weekCardContent(1);
    expect(card.artPath).toBeNull();
    expect(card.size).toBe("Todavía no hay embrión");
  });
});
