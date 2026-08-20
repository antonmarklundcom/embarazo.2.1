// K10 — "linked from herramientas + week articles".
//
// A guía that answers half a question should hand the reader the tool that
// answers the rest of it. "Control prenatal: IPS vs privado" is exactly the
// article somebody reads *while deciding where to give birth*, and until now
// it ended without ever telling her what either option costs.
//
// A typed map rather than an `<a>` inside the article HTML, for two reasons:
// no article in the seed contains a link today, so this would be the first
// piece of markup in `articles.json` that could rot into a 404 without
// anything noticing; and a mapping can be *tested* — the test below asserts
// every slug here exists and every href is a real route, which a string inside
// a blob of HTML can never be.
//
// Deliberately sparse. A "related tool" on every article is a template slot
// somebody eventually fills with the nearest-looking tool, and then the link
// means nothing.

export interface RelatedTool {
  href: string;
  label: string;
  /** Why this tool, said in the reader's terms rather than the product's. */
  blurb: string;
}

export const RELATED_TOOLS: Record<string, RelatedTool> = {
  "control-prenatal-ips-vs-privado": {
    href: "/herramientas/precios",
    label: "¿Cuánto cuesta?",
    blurb:
      "Lo que suele costar cada estudio y el parto en IPS, en el público y en privado.",
  },
  "derechos-embarazada-que-trabaja": {
    href: "/derechos",
    label: "Tus derechos y beneficios",
    blurb: "Calculá tu licencia y mirá qué te corresponde según tu situación.",
  },
  "que-llevar-al-sanatorio": {
    href: "/herramientas/checklist",
    label: "Checklist del bolso",
    blurb: "La lista completa, para ir tildando mientras armás el bolso.",
  },
};

export function relatedTool(slug: string): RelatedTool | null {
  return RELATED_TOOLS[slug] ?? null;
}
