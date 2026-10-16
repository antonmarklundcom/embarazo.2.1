import manifest from "@/public/assets/img/manifest.json";
import slots from "@/lib/editorial-image-slots.json";

export type EditorialImage = {
  src: string;
  srcSet: string;
  avifSrcSet: string;
  width: number;
  height: number;
  alt: string;
};

type ImageFile = { file: string; format: string; width: number; height: number };
type ManifestImage = { filename_base: string; alt_text: string; files: ImageFile[] };

/** Local, optimized assets only. A missing slot never requests a remote image. */
export function editorialImage(id: string): EditorialImage | null {
  const slug = (slots as Record<string, string>)[id];
  return slug ? editorialImageBySlug(slug) : null;
}

/** Shared manifest lookup for canonical-image aliases as well as editorial slots. */
export function editorialImageBySlug(slug: string): EditorialImage | null {
  const entry = (manifest.images as ManifestImage[]).find((image) => image.filename_base === slug);
  if (!entry) return null;
  const webp = entry.files.filter((file) => file.format === "webp").sort((a, b) => a.width - b.width);
  const fallback = webp[0];
  if (!fallback) return null;
  function sourceSet(format: string): string {
    const widths = new Map<number, string>();
    for (const file of entry!.files.filter((file) => file.format === format).sort((a, b) => a.width - b.width)) {
      if (!widths.has(file.width)) widths.set(file.width, `/assets/img/${file.file} ${file.width}w`);
    }
    return [...widths.values()].join(", ");
  }
  return {
    src: `/assets/img/${fallback.file}`,
    srcSet: sourceSet("webp"),
    avifSrcSet: sourceSet("avif"),
    width: fallback.width,
    height: fallback.height,
    alt: entry.alt_text,
  };
}
