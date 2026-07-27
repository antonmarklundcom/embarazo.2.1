"use client";

import { useState } from "react";
import type { WeekInfo } from "@/lib/types";

// BUILD-PLAN C3 (FEATURE-MAP #12). Size comparison with tabs.
//
// Preggers shows three tabs (baby / foot / hand). We show a tab only when we
// actually have that measurement — a tab that says "no tenemos este dato" three
// times is worse than no tabs, and inventing a foot length for a fetus is not
// something an app should do. The `footCm`/`handCm` fields exist on the week
// content so the medical reviewer can fill them in; the tabs appear on their
// own when she does.

export interface SizeMeasures {
  footCm?: number;
  handCm?: number;
}

type Tab = "bebe" | "pie" | "mano";

function formatCm(value: number): string {
  // Sub-centimetre measurements read better in millimetres.
  return value < 1
    ? `${Math.round(value * 10)} mm`
    : `${value.toString().replace(".", ",")} cm`;
}

export function SizeCard({
  info,
  measures,
  baby,
}: {
  info: WeekInfo;
  measures: SizeMeasures;
  baby: string;
}) {
  const tabs: Tab[] = ["bebe"];
  if (measures.footCm !== undefined) tabs.push("pie");
  if (measures.handCm !== undefined) tabs.push("mano");

  const [active, setActive] = useState<Tab>("bebe");

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Tamaño
      </p>

      {tabs.length > 1 && (
        <div className="mt-2 flex gap-2" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active === tab}
              onClick={() => setActive(tab)}
              className={`min-h-[40px] flex-1 rounded-full border text-sm font-extrabold transition ${
                active === tab
                  ? "border-terracotta bg-terracotta text-white"
                  : "border-line bg-white text-muted"
              }`}
            >
              {tab === "bebe" ? "Bebé" : tab === "pie" ? "Pie" : "Mano"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3">
        {active === "bebe" && (
          <>
            <p className="text-[15px] font-semibold leading-relaxed text-ink">
              {baby === "tu bebé" ? "Tu bebé está" : `${baby} está`} del tamaño
              de <strong className="font-extrabold">{info.sizeComparison}</strong>
              .
            </p>
            {(info.lengthCm !== undefined || info.weightG !== undefined) && (
              <p className="mt-1 text-sm text-muted">
                {info.lengthCm !== undefined && `Mide ${formatCm(info.lengthCm)}`}
                {info.lengthCm !== undefined && info.weightG !== undefined && " · "}
                {info.weightG !== undefined && `Pesa ${info.weightG} g`}
              </p>
            )}
          </>
        )}

        {active === "pie" && measures.footCm !== undefined && (
          <p className="text-[15px] font-semibold leading-relaxed text-ink">
            Su pie mide alrededor de{" "}
            <strong className="font-extrabold">
              {formatCm(measures.footCm)}
            </strong>
            .
          </p>
        )}

        {active === "mano" && measures.handCm !== undefined && (
          <p className="text-[15px] font-semibold leading-relaxed text-ink">
            Su mano mide alrededor de{" "}
            <strong className="font-extrabold">
              {formatCm(measures.handCm)}
            </strong>
            .
          </p>
        )}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Son medidas promedio. Cada bebé crece a su ritmo.
      </p>
    </section>
  );
}
