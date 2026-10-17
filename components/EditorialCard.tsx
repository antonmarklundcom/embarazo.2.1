import Link from "next/link";

import { editorialImage } from "@/lib/editorialImages";

// Short presentation labels only. The destination keeps the complete article
// title and body; the full title also remains the link's accessible name.
const CARD_TITLES: Record<string, string> = {
  "que-llevar-al-sanatorio": "El bolso para vos y para el bebé",
  "despues-del-nacimiento-tramites": "Registro Civil y cédula del bebé",
  "control-prenatal-ips-vs-privado": "Control prenatal en Paraguay",
  "vacunas-en-el-embarazo-pai": "Vacunas en el embarazo",
  "derechos-embarazada-que-trabaja": "Derechos de la embarazada que trabaja",
};

/** `priority` is opt-in for the first visible cards on a page, where the image is the LCP candidate. */
export function EditorialCard({
  slug,
  title,
  readTime,
  priority = false,
}: {
  slug: string;
  title: string;
  readTime: string;
  priority?: boolean;
}) {
  const image = editorialImage(slug);

  return (
    <Link
      href={`/guias/${slug}`}
      data-editorial-card
      className="group block h-full overflow-hidden rounded-[22px] border border-line/70 bg-white transition-colors hover:border-petrol/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol"
    >
      {image && <picture className="block overflow-hidden bg-sand-bg">
        <source
          type="image/avif"
          srcSet={image.avifSrcSet}
          sizes="(min-width: 1280px) 320px, (min-width: 640px) 45vw, 74vw"
        />
        {/* Local, pre-sized AVIF/WebP assets use the shared responsive manifest. */}
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes="(min-width: 1280px) 320px, (min-width: 640px) 45vw, 74vw"
          width={image.width}
          height={image.height}
          alt={image.alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className="aspect-[4/3] w-full object-cover"
        />
      </picture>}
      <div className="space-y-3 p-4">
        <h3 className="text-[16px] font-extrabold leading-[1.4] text-ink">
          {CARD_TITLES[slug] ?? title}
        </h3>
        <p className="text-xs font-semibold text-muted">{readTime}</p>
      </div>
    </Link>
  );
}

/** The same guía as a compact row: square thumbnail, title, read time. Used where a list reads better than a shelf ("Qué esperar" on Hoy). */
export function EditorialRow({
  slug,
  title,
  readTime,
}: {
  slug: string;
  title: string;
  readTime: string;
}) {
  const image = editorialImage(slug);

  return (
    <Link
      href={`/guias/${slug}`}
      data-editorial-card
      className="flex min-h-[76px] items-center gap-3 rounded-tile p-1.5 transition-colors hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol"
    >
      <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-tile bg-sand-bg">
        {image && (
          <picture className="contents">
            <source type="image/avif" srcSet={image.avifSrcSet} sizes="64px" />
            <img
              src={image.src}
              srcSet={image.srcSet}
              sizes="64px"
              width={64}
              height={64}
              alt=""
              loading="lazy"
              decoding="async"
              className="block h-16 w-16 object-cover"
            />
          </picture>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-extrabold leading-snug text-ink">{CARD_TITLES[slug] ?? title}</span>
        <span className="mt-0.5 block text-xs font-semibold text-muted">{readTime}</span>
      </span>
    </Link>
  );
}
