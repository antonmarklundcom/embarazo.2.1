import { serializeJsonLd, type JsonLdData } from "@/lib/seo/jsonLd";

// Item 7 — prints one schema.org block. A server component: no client JS.
// JSON-LD is data, not script — browsers never execute it — and the CSP's
// `script-src 'self' 'unsafe-inline'` already permits an inline block, so
// next.config.ts needs no change. `serializeJsonLd` escapes `<` so content
// can never close the tag.
export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
