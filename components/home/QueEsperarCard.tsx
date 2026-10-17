"use client";

import Link from "next/link";

import { ToolIcon, type ToolIconName } from "@/components/ToolIcon";
import { WeekArticleFeed } from "@/components/WeekArticleFeed";
import type { PregnancyAnswers } from "@/lib/onboarding/personalisation";

// Hoy's "Qué esperar" card (Flo benchmark, 2026-10-17): four round shortcuts
// into the week, then this week's guías as thumbnail rows. The guía list is
// the same "Para leer esta semana" region as before, in its list layout.

const SHORTCUTS = (week: number): { href: string; label: string; icon: ToolIconName; tone: string }[] => [
  { href: `/semana/${week}`, label: "Tu bebé", icon: "feet", tone: "bg-pastel-salvia" },
  { href: `/semana/${week}#preguntar`, label: "Para preguntar", icon: "faq", tone: "bg-pastel-arena" },
  { href: "/herramientas/sintomas", label: "Síntomas", icon: "symptoms", tone: "bg-pastel-rosa" },
  { href: "/herramientas/comer", label: "Qué comer", icon: "food", tone: "bg-pastel-celeste" },
];

export function QueEsperarCard({ week, answers }: { week: number; answers?: PregnancyAnswers }) {
  return (
    <section aria-labelledby="que-esperar" className="rounded-card border border-line/70 bg-white p-4">
      {/* The week number stays out of the region's name: "semana N" regions
          belong to the new-week card, and e2e/new-week.spec.ts counts them. */}
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol" aria-hidden>
        Semana {week}
      </p>
      <h2 id="que-esperar" className="mt-0.5 text-lg font-extrabold leading-snug text-ink">
        Qué esperar esta semana
      </h2>
      <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="Atajos de la semana">
        {SHORTCUTS(week).map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex min-h-[84px] flex-col items-center gap-1.5 rounded-tile p-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-petrol"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-full text-petrol ${item.tone}`} aria-hidden>
                <ToolIcon name={item.icon} size={24} />
              </span>
              <span className="text-[11px] font-bold leading-tight text-ink">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-line/70 pt-3">
        <WeekArticleFeed week={week} answers={answers} layout="list" />
      </div>
    </section>
  );
}
