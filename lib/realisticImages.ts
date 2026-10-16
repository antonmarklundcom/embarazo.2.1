import slots from "@/lib/realistic-image-slots.json";
import { editorialImageBySlug, type EditorialImage } from "@/lib/editorialImages";

/**
 * Existing seed paths stay valid, including publication checks and offline
 * fallbacks. A replacement is selected only when both its alias and optimized
 * manifest entry exist; generation and placement can therefore be incremental.
 */
export function realisticImage(canonicalSrc: string): EditorialImage | null {
  const path = canonicalSrc.split("?")[0]!;
  const slug = (slots as Record<string, string>)[path];
  return slug ? editorialImageBySlug(slug) : null;
}