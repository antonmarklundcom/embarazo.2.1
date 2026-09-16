// W4: the Paraguay-specific block of "Hoy" — derechos, recursos, temporada —
// moved verbatim out of `app/(app)/page.tsx`, which already described these
// three as one group ("Paraguay-specific cards (derechos, recursos, temporada)
// stay below"). `LocalResourcesBlock` is still the same `next/dynamic`
// component from `dynamicSections`, so nothing about its chunking changes.

import Link from "next/link";

import type { Trimester } from "@/lib/types";

import { LocalResourcesBlock } from "./dynamicSections";

export function HomeParaguayCards({ trimester }: { trimester: Trimester }) {
  return (
    <>
      {/* Rights & benefits navigator */}
      <Link
        href="/derechos"
        className="block rounded-card border border-line bg-white p-4 transition active:scale-[0.99]"
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          ¿Qué te corresponde?
        </p>
        <h3 className="mt-1 text-base font-extrabold text-ink">
          Tus derechos y beneficios en Paraguay
        </h3>
        <p className="mt-1 text-sm font-semibold text-muted">
          Licencia de maternidad con tus fechas, subsidio de IPS, gratuidad en
          Salud Pública y más, según tu situación.
        </p>
      </Link>

      {/* Local resources (placements) */}
      <LocalResourcesBlock trimester={trimester} />

      {/* Seasonal info card */}
      <Link
        href="/guias/dengue-zika-chikungunya-embarazo"
        className="block rounded-card bg-pastel-salvia p-4 transition active:scale-[0.99]"
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          De temporada
        </p>
        <h3 className="mt-1 text-base font-extrabold text-ink">
          Cuidate del dengue en el embarazo
        </h3>
        <p className="mt-1 text-sm font-semibold text-ink/70">
          Con el calor y la lluvia, prevenir el mosquito es parte de tu cuidado.
        </p>
      </Link>
    </>
  );
}
