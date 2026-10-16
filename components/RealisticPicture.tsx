import type { ImgHTMLAttributes, ReactNode, Ref } from "react";
import { realisticImage } from "@/lib/realisticImages";

type RealisticPictureProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt"> & {
  canonicalSrc: string;
  alt: string;
  imageRef?: Ref<HTMLImageElement>;
  pictureClassName?: string;
  /** Preserve an existing renderer, such as next/image, until art is placed. */
  fallback?: ReactNode;
};

/** Responsive local art with the original URL and load/error hooks preserved. */
export function RealisticPicture({
  canonicalSrc,
  alt,
  imageRef,
  pictureClassName = "contents",
  fallback,
  sizes,
  width,
  height,
  ...imageProps
}: RealisticPictureProps) {
  const image = realisticImage(canonicalSrc);
  if (!image && fallback !== undefined) return <>{fallback}</>;

  return (
    <picture className={pictureClassName} data-realistic-image={canonicalSrc}>
      {image?.avifSrcSet && <source type="image/avif" srcSet={image.avifSrcSet} sizes={sizes} />}
      {/* Preoptimized local files avoid a new optimizer request while offline. */}
      <img
        {...imageProps}
        ref={imageRef}
        src={image?.src ?? canonicalSrc}
        srcSet={image?.srcSet || undefined}
        sizes={sizes}
        width={width ?? image?.width}
        height={height ?? image?.height}
        alt={alt}
        data-canonical-src={canonicalSrc}
      />
    </picture>
  );
}