import Link from "next/link";
import type { Metadata } from "next";

import { EditorialCard } from "@/components/EditorialCard";
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

function shelfFor(cluster?: string) {
  if (cluster === "salud") return "salud";
  if (cluster === "logistica" || cluster === "tramites") return "llegada";
  return "dia-a-dia";
}

export default async function GuiasPage() {
  const articles = await getArticles();

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

      {SHELVES.map((shelf) => {
        const shelfArticles = articles.filter((article) => shelfFor(article.cluster) === shelf.id);
        if (shelfArticles.length === 0) return null;

        return (
          <section key={shelf.id} aria-labelledby={`guias-${shelf.id}`} className="space-y-4">
            <h2 id={`guias-${shelf.id}`} className="text-xl font-extrabold leading-snug text-ink">
              {shelf.title}
            </h2>
            <p id={`guias-${shelf.id}-instrucciones`} className="sr-only sm:hidden">
              Deslizá para ver las guías. Con teclado, enfocá la lista y usá las flechas.
            </p>
            <ul
              aria-label={shelf.title}
              aria-describedby={`guias-${shelf.id}-instrucciones`}
              tabIndex={0}
              className="-mx-1 flex gap-4 overflow-x-auto rounded-[22px] px-1 pb-4 pt-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol sm:grid sm:grid-cols-2 xl:grid-cols-3"
            >
              {shelfArticles.map((article) => (
                <li key={article.slug} className="w-[min(74vw,17rem)] shrink-0 sm:w-auto">
                  <EditorialCard
                    slug={article.slug}
                    title={article.title}
                    readTime={readTimeLabel(article.html)}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

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
