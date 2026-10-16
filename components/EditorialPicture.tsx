import { editorialImage } from "@/lib/editorialImages";

/** Local editorial art only. Missing assets have no visible or empty wrapper. */
export function EditorialPicture({
  id,
  className,
  sizes = "(min-width: 768px) 640px, 100vw",
  priority = false,
}: {
  id: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const image = editorialImage(id);
  if (!image) return null;

  return (
    <picture
      data-editorial-image={id}
      className={`block overflow-hidden ${className ?? ""}`}
    >
      {image.avifSrcSet && (
        <source type="image/avif" srcSet={image.avifSrcSet} sizes={sizes} />
      )}
      {/* Pre-sized local AVIF/WebP sources preserve the responsive manifest. */}
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={sizes}
        width={image.width}
        height={image.height}
        alt={image.alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className="h-full w-full object-cover"
      />
    </picture>
  );
}
