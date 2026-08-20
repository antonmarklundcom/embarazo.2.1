import type { BilingualText } from "@/lib/content/schemas";

/**
 * K19-L0 — renders an es-PY string with its Guaraní twin stacked underneath.
 *
 * Every safety surface goes through this component rather than writing the
 * `{t.gn && <span lang="gn">…</span>}` pair inline, for three reasons:
 *
 * 1. **`lang="gn"` is not cosmetic.** Without it a screen reader pronounces
 *    "Osẽramo ndehegui tuguy" with Spanish phonotactics, which is worse than
 *    silence on an emergency screen. One component means one place that can
 *    ever get the attribute wrong.
 * 2. **The rule is "always", not "when the locale is Guaraní"** (D6). Nothing
 *    here reads the locale, and that omission is the feature — a woman who
 *    never opened Ajustes still gets the Guaraní line.
 * 3. It keeps `gn`-less entries rendering as plain text with no wrapper, so
 *    adding a translation later never reflows a screen that already shipped.
 *
 * `as` exists because these strings are headings as often as they are body
 * copy, and a heading whose Spanish and Guaraní are two sibling `<h2>`s reads
 * as two sections to anything that walks the document outline.
 */
export function Bilingual({
  text,
  className,
  gnClassName = "mt-0.5 block text-xs font-semibold italic text-muted",
  as: Tag = "span",
}: {
  text: BilingualText;
  className?: string;
  gnClassName?: string;
  as?: "span" | "p" | "div";
}) {
  if (!text.gn) {
    return className ? <Tag className={className}>{text.es}</Tag> : <>{text.es}</>;
  }
  return (
    <Tag className={className}>
      {text.es}
      <span lang="gn" className={gnClassName}>
        {text.gn}
      </span>
    </Tag>
  );
}
