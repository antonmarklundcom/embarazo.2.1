import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mibebe.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Personal on-device tool pages carry no public content and aren't
        // meaningful search results.
        // A7: /admin is never linked, never in the sitemap, and returns 404
        // to anyone who is not an administrator. Listing it here is the polite
        // half of that; the 404 is the half that actually matters.
        disallow: ["/herramientas/", "/ajustes", "/api/", "/admin"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
