import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nido.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Personal on-device tool pages carry no public content and aren't
        // meaningful search results.
        disallow: ["/herramientas/", "/ajustes", "/api/"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
