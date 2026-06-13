import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticles } from "@/lib/wordpress";
import { getArticleBySlug } from "@/lib/seed/articles";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";

// Statically generate the guías so they precache for offline (spec §9).
export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: "Guía no encontrada" };
  return { title: article.title, description: article.excerpt };
}

export default async function GuiaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <article className="space-y-4">
      <Link href="/guias" className="text-sm text-petrol">
        ← Guías
      </Link>

      <header>
        {article.cluster && (
          <span className="text-xs font-medium uppercase tracking-wide text-terracotta">
            {article.cluster}
          </span>
        )}
        <h1 className="mt-1 text-2xl font-medium text-petrol-dark">
          {article.title}
        </h1>
        <div className="mt-2">
          <MedicalReviewByline />
        </div>
      </header>

      <div
        className="prose-nido text-ink"
        // Seed HTML is authored in-repo (not user input); safe to render.
        dangerouslySetInnerHTML={{ __html: article.html }}
      />

      <div className="mt-6 rounded-card border border-sage/30 bg-sage/5 p-4">
        <p className="text-[11px] leading-relaxed text-muted">
          Esta guía es solo informativa y no reemplaza la atención de un
          profesional de la salud. No realiza diagnósticos. Ante cualquier duda o
          síntoma, contactá a tu sanatorio.
        </p>
      </div>
    </article>
  );
}
