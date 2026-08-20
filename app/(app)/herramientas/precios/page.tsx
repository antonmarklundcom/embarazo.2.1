"use client";

import Link from "next/link";

import { PUBLISHED_PRICES } from "@/lib/seed/prices";
import { useProfile } from "@/lib/useProfile";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";
import type { CareSetting } from "@/lib/onboarding/personalisation";
import type { PriceEntry } from "@/lib/content/schemas";
import {
  CARE_SETTING_LABEL,
  CARE_SETTING_ORDER,
  bandFor,
  bandLabel,
  openingSetting,
  sourceMonthLabel,
} from "@/lib/prices";

// K10 / P6 — "¿Cuánto cuesta?" (docs/FABLE-PLAN-2026-08.md §3).
//
// The question nobody in Paraguay can get a straight answer to, and the one
// that decides where a woman gives birth. Same pipeline as D3's food lookup:
// validated JSON, `reviewedOnly` + `publishedOnly`, fully client-side, works
// offline once the page is cached.
//
// Three things are deliberate about how it reads:
//
//  1. **Every procedure shows all three columns at once.** The tool is a
//     comparison, and a woman who has been told a cesárea costs eighteen
//     million has usually never been told that the public system does it for
//     nothing. Her own setting (K9-F5) is highlighted, not isolated.
//  2. **Ranges, dated, with the source visible.** Not one number that reads
//     like a quote the app is in no position to give.
//  3. **The empty state is a real state**, not a bug. Nothing renders until a
//     reviewer signs the figures off, and the page says so plainly rather than
//     showing a spinner or a "próximamente".
export default function PreciosPage() {
  const profile = useProfile();
  const mine = openingSetting(profile.careSetting);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">
          ¿Cuánto cuesta?
        </h1>
        <p className="mt-1 text-sm text-muted">
          Lo que suele costar cada cosa del embarazo en IPS, en el sistema
          público y en un sanatorio privado. Son rangos de referencia, no un
          presupuesto: el precio final te lo tiene que dar el lugar donde te
          atendés.
        </p>
      </header>

      {PUBLISHED_PRICES.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {mine && (
            <p className="rounded-card border border-line bg-pastel-celeste px-4 py-3 text-sm font-semibold text-ink">
              Marcamos la columna de <strong>{CARE_SETTING_LABEL[mine]}</strong>{" "}
              porque es donde nos dijiste que te atendés. Podés cambiarlo en
              Ajustes.
            </p>
          )}

          <div className="space-y-3">
            {PUBLISHED_PRICES.map((entry) => (
              <PriceCard key={entry.id} entry={entry} mine={mine} />
            ))}
          </div>

          <MedicalReviewByline />
        </>
      )}

      <section className="rounded-card border border-line bg-white p-4">
        <h2 className="text-base font-extrabold text-ink">Antes de pagar</h2>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted">
          <li>
            • Pedí el presupuesto <strong>por escrito</strong>, y preguntá qué
            pasa si el parto termina en cesárea.
          </li>
          <li>
            • Preguntá si entran el anestesista, el neonatólogo y los días de
            internación, o si se cobran aparte.
          </li>
          <li>
            • En el sistema público el control, el parto y los estudios son
            gratuitos por ley (Ley 5099/2013).
          </li>
        </ul>
        <Link
          href="/derechos"
          className="mt-3 inline-block text-sm font-extrabold text-terracotta"
        >
          Ver qué te corresponde →
        </Link>
      </section>
    </div>
  );
}

/**
 * The empty state, which is where this tool starts life.
 *
 * It says what is missing and why, rather than pretending to be loading. The
 * alternative — shipping the invented figures behind a disclaimer — is how an
 * app ends up making somebody's financial decision with a number nobody
 * checked.
 */
function EmptyState() {
  return (
    <section className="rounded-card border border-line bg-white p-5">
      <h2 className="text-base font-extrabold text-ink">
        Todavía no publicamos los precios
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Estamos relevando los aranceles reales de sanatorios y laboratorios, y
        no queremos publicar un número que no podamos sostener: con esto la
        gente decide dónde tener a su bebé. Cuando estén verificados aparecen
        acá, con la fecha del relevamiento.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Mientras tanto: en IPS y en el sistema público el control prenatal, los
        estudios de rutina y el parto no se te cobran.
      </p>
      <Link
        href="/derechos"
        className="mt-3 inline-block text-sm font-extrabold text-terracotta"
      >
        Ver qué te corresponde →
      </Link>
    </section>
  );
}

function PriceCard({
  entry,
  mine,
}: {
  entry: PriceEntry;
  mine: CareSetting | null;
}) {
  return (
    <article className="rounded-card border border-line bg-white p-4">
      <h2 className="text-base font-extrabold text-ink">{entry.name}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{entry.summary}</p>

      <dl className="mt-3 space-y-2">
        {CARE_SETTING_ORDER.map((setting) => {
          const band = bandFor(entry, setting);
          if (!band) return null;
          const highlighted = setting === mine;
          return (
            <div
              key={setting}
              className={`rounded-tile px-3 py-2 ${
                highlighted ? "bg-pastel-celeste" : "bg-cream"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm font-extrabold text-ink">
                  {CARE_SETTING_LABEL[setting]}
                </dt>
                <dd className="text-sm font-black text-ink">{bandLabel(band)}</dd>
              </div>
              {band.note && (
                <p className="mt-1 text-xs leading-relaxed text-muted">{band.note}</p>
              )}
            </div>
          );
        })}
      </dl>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Fuente: {entry.source} · Precios de {sourceMonthLabel(entry.sourceDate)}.
      </p>
    </article>
  );
}
