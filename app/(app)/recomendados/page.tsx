"use client";

import { useFlag } from "@/lib/flags/useFlag";
import { useProfile } from "@/lib/useProfile";
import { PUBLISHED_RECOMENDADOS, recomendadosForStage } from "@/lib/seed/recomendados";
import { RecomendadoCard } from "@/components/RecomendadoCard";

// U3 — "Recomendados" (replaces E4/"Beneficios", feature map #27). Full list
// behind the rail's "Ver todos". Same double gate as the rail: the
// useFlag("recomendados") switch (off by default, docs/decisions-needed.md
// tracks the founder's go-ahead) and publishedOnly() over the seed content —
// with either off, this renders the honest empty state, never a stale list.
export default function RecomendadosPage() {
  const enabled = useFlag("recomendados");
  const profile = useProfile();
  const items = recomendadosForStage(PUBLISHED_RECOMENDADOS, profile.trimester);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Recomendados</h1>
        <p className="text-sm text-muted">
          Recursos gratuitos y verificados para tu embarazo, elegidos a mano.
        </p>
      </header>

      {(!enabled || items.length === 0) && (
        <div className="rounded-card bg-white p-5 text-center shadow-soft">
          <p className="text-sm text-ink">Todavía no tenemos recomendados para mostrar.</p>
          <p className="mt-1 text-sm text-muted">
            Estamos armando esta sección con recursos reales y verificados, uno por uno.
          </p>
        </div>
      )}

      {enabled && items.length > 0 && (
        <div className="space-y-3">
          {items.map((r) => (
            <RecomendadoCard key={r.id} recomendado={r} />
          ))}
        </div>
      )}
    </div>
  );
}
