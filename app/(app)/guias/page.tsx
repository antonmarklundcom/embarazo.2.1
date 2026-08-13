import Link from "next/link";
import type { Metadata } from "next";
import { getArticles } from "@/lib/wordpress";
import { PUBLISHED_VIDEOS } from "@/lib/seed/videos";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import { readTimeLabel } from "@/lib/articles/readTime";

export const metadata: Metadata = {
  title: "Guías",
  description: "Guías del embarazo hechas para Paraguay: salud, trámites y derechos.",
};

export default async function GuiasPage() {
  const articles = await getArticles();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Consejos</h1>
        <p className="mt-0.5 text-sm font-semibold text-muted">
          Información del embarazo pensada para Paraguay.
        </p>
      </header>

      {PUBLISHED_VIDEOS.length > 0 && (
        <Link
          href="/guias/videos"
          className="block rounded-card bg-pastel-celeste p-4 transition active:scale-[0.99]"
        >
          <span className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
            Videos
          </span>
          <h2 className="mt-1 text-base font-extrabold text-ink">
            Galería de videos educativos
          </h2>
          <p className="mt-1 text-sm font-semibold text-ink/70">
            Videos seleccionados, filtrables por tema y trimestre.
          </p>
        </Link>
      )}

      <section className="space-y-2.5">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Lo más leído
        </h2>
        <div className="space-y-3">
          {articles.map((a, i) => {
            const tone = [
              "bg-pastel-rosa",
              "bg-pastel-celeste",
              "bg-pastel-salvia",
              "bg-pastel-lavanda",
              "bg-pastel-arena",
            ][i % 5];
            return (
              <Link
                key={a.slug}
                href={`/guias/${a.slug}`}
                className="block overflow-hidden rounded-card border border-line bg-white transition active:scale-[0.99]"
              >
                <div className={`flex h-24 items-end ${tone} p-3`}>
                  {a.cluster && (
                    <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-extrabold text-ink">
                      {a.cluster}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-[15px] font-extrabold leading-snug text-ink">
                    {a.title}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {a.excerpt}
                  </p>
                  {/* C6 (map #17): computed from the body, never stored. */}
                  <p className="mt-2 text-[11px] font-bold text-muted">
                    {readTimeLabel(a.html)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="pt-2">
        <MedicalReviewByline />
      </div>
    </div>
  );
}
