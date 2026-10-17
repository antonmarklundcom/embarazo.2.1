import Link from "next/link";
import type { Metadata } from "next";

import { EditorialCard } from "@/components/EditorialCard";
import { RealisticPicture } from "@/components/RealisticPicture";
import { editorialImage } from "@/lib/editorialImages";
import { hasWeekArt, weekArtSrc } from "@/lib/hero/weekArt";
import { PUBLISHED_EJERCICIOS } from "@/lib/seed/ejercicios";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import { readTimeLabel } from "@/lib/articles/readTime";
import { PUBLISHED_VIDEOS } from "@/lib/seed/videos";
import { getArticles } from "@/lib/wordpress";

export const metadata: Metadata = {
  title: "Guías",
  description: "Guías del embarazo hechas para Paraguay: salud, trámites y derechos.",
};

const SHELVES = [
  { id: "salud", title: "Cuidá tu salud" },
  { id: "dia-a-dia", title: "Tu día a día" },
  { id: "llegada", title: "Prepará la llegada" },
] as const;

const WEEKS = Array.from({ length: 40 }, (_, index) => index + 3).filter(hasWeekArt);

const SHELF_LIST_CLASS =
  "shelf -mx-1 flex gap-3 overflow-x-auto rounded-[22px] px-1 pb-3 pt-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol";
const TILE_LINK_CLASS =
  "group block overflow-hidden rounded-[18px] border border-line/70 bg-white transition-colors hover:border-petrol/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol";

function ShelfHeading({ id, title, href }: { id: string; title: string; href?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-xs font-extrabold uppercase tracking-wider text-muted">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          aria-label={`Ver todas: ${title}`}
          className="text-sm font-bold text-petrol focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol"
        >
          Ver todas
        </Link>
      )}
    </div>
  );
}

function shelfFor(cluster?: string) {
  if (cluster === "salud") return "salud";
  if (cluster === "logistica" || cluster === "tramites") return "llegada";
  return "dia-a-dia";
}

export default async function GuiasPage() {
  const articles = await getArticles();
  const seasonalFruit = editorialImage("seasonal-fruit");
  const firstShelfId = SHELVES.find((shelf) =>
    articles.some((article) => shelfFor(article.cluster) === shelf.id),
  )?.id;

  return (
    <div className="space-y-8 pb-2 sm:space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-bold tracking-wide text-petrol">Hecho para Paraguay</p>
        <h1 className="text-[30px] font-black leading-tight tracking-tight text-ink sm:text-4xl">
          Consejos para vos
        </h1>
        <p className="max-w-lg text-[15px] leading-relaxed text-muted">
          Guías para acompañarte en cada etapa del embarazo.
        </p>
      </header>

      <section aria-labelledby="guias-semanas" className="space-y-3">
        <ShelfHeading id="guias-semanas" title="Tu bebé semana a semana" />
        <ul aria-label="Tu bebé semana a semana" tabIndex={0} className={SHELF_LIST_CLASS}>
          {WEEKS.map((week) => (
            <li key={week} className="w-28 shrink-0">
              <Link href={`/semana/${week}`} className={TILE_LINK_CLASS}>
                <RealisticPicture
                  canonicalSrc={weekArtSrc(week)}
                  alt=""
                  sizes="112px"
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full bg-sand-bg object-cover"
                />
                <span className="block px-2 py-2 text-center text-sm font-bold text-ink">Semana {week}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {SHELVES.map((shelf) => {
        const shelfArticles = articles.filter((article) => shelfFor(article.cluster) === shelf.id);
        if (shelfArticles.length === 0) return null;
        // The first rendered shelf's first two cards are the likely LCP image; every other card stays lazy.
        const isFirstShelf = shelf.id === firstShelfId;

        return (
          <section key={shelf.id} aria-labelledby={`guias-${shelf.id}`} className="space-y-4">
            <ShelfHeading id={`guias-${shelf.id}`} title={shelf.title} />
            <p id={`guias-${shelf.id}-instrucciones`} className="sr-only sm:hidden">
              Deslizá para ver las guías. Con teclado, enfocá la lista y usá las flechas.
            </p>
            <ul
              aria-label={shelf.title}
              aria-describedby={`guias-${shelf.id}-instrucciones`}
              tabIndex={0}
              className="shelf -mx-1 flex gap-4 overflow-x-auto rounded-[22px] px-1 pb-4 pt-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol sm:grid sm:grid-cols-2 xl:grid-cols-3"
            >
              {shelfArticles.map((article, index) => (
                <li key={article.slug} className="w-[min(74vw,17rem)] shrink-0 sm:w-auto">
                  <EditorialCard
                    slug={article.slug}
                    title={article.title}
                    readTime={readTimeLabel(article.html)}
                    priority={isFirstShelf && index < 2}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {PUBLISHED_EJERCICIOS.length > 0 && (
        <section aria-labelledby="guias-ejercicios" className="space-y-3">
          <ShelfHeading id="guias-ejercicios" title="Ejercicios" href="/herramientas/ejercicios" />
          <ul aria-label="Ejercicios" tabIndex={0} className={SHELF_LIST_CLASS}>
            {PUBLISHED_EJERCICIOS.map((exercise) => (
              <li key={exercise.id} className="w-36 shrink-0">
                <Link href={`/herramientas/ejercicios/${exercise.id}`} className={TILE_LINK_CLASS}>
                  <RealisticPicture
                    canonicalSrc={exercise.steps[0]?.imageSrc ?? ""}
                    alt=""
                    sizes="144px"
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full bg-sand-bg object-cover"
                  />
                  <span className="block px-2 py-2 text-sm font-bold leading-snug text-ink">{exercise.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="guias-comer" className="space-y-3">
        <ShelfHeading id="guias-comer" title="Qué comer" href="/herramientas/comer" />
        <Link href="/herramientas/comer" className={`${TILE_LINK_CLASS} flex items-center gap-3 p-2`}>
          {seasonalFruit && (
            <picture className="block h-16 w-16 shrink-0 overflow-hidden rounded-[12px] bg-sand-bg">
              <source type="image/avif" srcSet={seasonalFruit.avifSrcSet} sizes="64px" />
              <img
                src={seasonalFruit.src}
                srcSet={seasonalFruit.srcSet}
                sizes="64px"
                width={seasonalFruit.width}
                height={seasonalFruit.height}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </picture>
          )}
          <span className="text-base font-extrabold text-ink">Qué comer</span>
        </Link>
      </section>

      {PUBLISHED_VIDEOS.length > 0 && (
        <Link
          href="/guias/videos"
          className="block rounded-[22px] bg-pastel-celeste p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol"
        >
          <h2 className="text-lg font-extrabold text-ink">Videos educativos</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Explorá videos seleccionados por tema y trimestre.
          </p>
          <span className="mt-3 inline-block text-sm font-bold text-petrol">Ver videos →</span>
        </Link>
      )}

      <MedicalReviewByline />
    </div>
  );
}
