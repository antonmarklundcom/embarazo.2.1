"use client";

import { useMemo, useState } from "react";
import { PUBLISHED_FOOD } from "@/lib/seed/food";
import type { FoodEntry, FoodVerdict } from "@/lib/types";

// D3 — "¿Puedo comer...?" food lookup (BUILD-PLAN.md).
//
// Instant, fully client-side search over PUBLISHED_FOOD — no API call, no
// network, works offline the moment the page's JS is cached (same as every
// other herramientas tool). PUBLISHED_FOOD already excludes every entry
// without a reviewedBy (lib/seed/food.ts + lib/seed/gate.ts's reviewedOnly),
// so this page can never render an unreviewed verdict even if food.json
// grows without anyone touching this file.

const VERDICT_LABEL: Record<FoodVerdict, string> = {
  safe: "Sí, tranquila",
  precaucion: "Con precaución",
  evitar: "Mejor evitar",
};

const VERDICT_STYLE: Record<FoodVerdict, string> = {
  safe: "bg-pastel-salvia text-ink",
  precaucion: "bg-pastel-arena text-ink",
  evitar: "bg-pastel-rosa text-ink",
};

function matches(entry: FoodEntry, needle: string): boolean {
  if (!needle) return true;
  const haystack = [entry.name, ...(entry.synonyms ?? [])]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export default function ComerPage() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PUBLISHED_FOOD.filter((entry) => matches(entry, needle)).sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
  }, [query]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          ¿Puedo comer...?
        </h1>
        <p className="text-sm text-muted">
          Buscá un alimento o una bebida y mirá si podés comerlo, con qué
          cuidado, y por qué. Funciona sin internet.
        </p>
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscá por ejemplo: tereré, sushi, chipa..."
        aria-label="Buscar un alimento o bebida"
        className="min-h-[44px] w-full rounded-tile border border-black/10 bg-white px-3 text-sm focus:border-petrol focus:outline-none"
      />

      {PUBLISHED_FOOD.length === 0 && (
        <div className="rounded-card bg-white p-5 text-center shadow-soft">
          <p className="text-sm text-ink">
            Esta lista todavía no fue revisada por el equipo médico.
          </p>
          <p className="mt-1 text-sm text-muted">
            En cuanto esté revisada, vas a poder buscar acá qué podés comer y
            qué conviene evitar.
          </p>
        </div>
      )}

      {PUBLISHED_FOOD.length > 0 && results.length === 0 && (
        <div className="rounded-card bg-white p-5 text-center shadow-soft">
          <p className="text-sm text-ink">No encontramos ese alimento todavía.</p>
          <p className="mt-1 text-sm text-muted">
            Probá con otro nombre, o ante la duda consultá a tu médico/a.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((entry) => (
          <FoodCard key={entry.id} entry={entry} />
        ))}
      </div>

      {PUBLISHED_FOOD.length > 0 && (
        <p className="text-[11px] leading-relaxed text-muted">
          Esta información es general y orientativa, no reemplaza la consulta
          con tu médico/a. Ante cualquier duda puntual sobre tu embarazo,
          consultá a tu equipo de salud.
        </p>
      )}
    </div>
  );
}

function FoodCard({ entry }: { entry: FoodEntry }) {
  return (
    <article className="rounded-card bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-extrabold text-ink">{entry.name}</h2>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-extrabold ${VERDICT_STYLE[entry.verdict]}`}
        >
          {VERDICT_LABEL[entry.verdict]}
        </span>
      </div>
      {entry.synonyms && entry.synonyms.length > 0 && (
        <p className="mt-0.5 text-xs text-muted">{entry.synonyms.join(" · ")}</p>
      )}
      <p className="mt-2 text-sm font-semibold leading-relaxed text-ink">
        {entry.reason}
      </p>
      {entry.detail && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{entry.detail}</p>
      )}
      <p className="mt-2 text-[11px] text-muted">Fuente: {entry.source}</p>
    </article>
  );
}
