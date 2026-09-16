"use client";

import Link from "next/link";

import { useFlag } from "@/lib/flags/useFlag";
import { PUBLISHED_RECOMENDADOS, recomendadosForStage } from "@/lib/seed/recomendados";
import type { Trimester } from "@/lib/types";
import { RecomendadoCard } from "./RecomendadoCard";

// U3 — "Recomendados" rail (replaces E4/"Beneficios"). Self-gates on
// useFlag("recomendados") (default off) so U11 can mount it on the home
// screen with no extra condition at the call site — same contract
// WeekArticleFeed already follows for "nothing to show, render nothing".
//
// Recomendados are bundled seed data (like articles), not an API fetch: the
// whole collection is ~8 small JSON entries, already in the client bundle for
// /recomendados, and there is no server-side state to vary by request.

export function RecomendadosRail({ trimester }: { trimester?: Trimester }) {
  const enabled = useFlag("recomendados");
  const items = recomendadosForStage(PUBLISHED_RECOMENDADOS, trimester).slice(0, 6);

  if (!enabled || items.length === 0) return null;

  return (
    <section aria-labelledby="recomendados" className="space-y-2.5 pt-1">
      <div className="flex items-baseline justify-between">
        <h2
          id="recomendados"
          className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
        >
          Recomendados
        </h2>
        <Link href="/recomendados" className="text-[13px] font-extrabold text-terracotta">
          Ver todos
        </Link>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {items.map((r) => (
          <div key={r.id} className="w-[240px] shrink-0">
            <RecomendadoCard recomendado={r} />
          </div>
        ))}
      </div>
    </section>
  );
}
