import Link from "next/link";
import type { Metadata } from "next";
import { getArticles } from "@/lib/wordpress";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";

export const metadata: Metadata = {
  title: "Guías",
  description: "Guías del embarazo hechas para Paraguay: salud, trámites y derechos.",
};

export default async function GuiasPage() {
  const articles = await getArticles();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-medium text-petrol-dark">Guías</h1>
        <p className="text-sm text-muted">
          Información del embarazo pensada para Paraguay.
        </p>
      </header>

      <div className="space-y-3">
        {articles.map((a) => (
          <Link
            key={a.slug}
            href={`/guias/${a.slug}`}
            className="block rounded-card bg-white p-4 shadow-soft transition active:scale-[0.99]"
          >
            {a.cluster && (
              <span className="text-xs font-medium uppercase tracking-wide text-terracotta">
                {a.cluster}
              </span>
            )}
            <h2 className="mt-0.5 text-base font-medium text-ink">{a.title}</h2>
            <p className="mt-1 text-sm text-muted">{a.excerpt}</p>
          </Link>
        ))}
      </div>

      <div className="pt-2">
        <MedicalReviewByline />
      </div>
    </div>
  );
}
