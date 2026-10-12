"use client";
import { useId, useRef, useState } from "react";
import { formatLength, formatWeight, getWeek } from "@/lib/weeks";
import { formatCm, limbSize } from "@/lib/seed/limbSizes";
import { comparisonCaption } from "@/lib/seed/comparisons";
import { measurementNote, switchesMeasurementAt } from "@/lib/hero/scale";
import { useShowComparison } from "@/lib/hero/preferences";
import { ComparisonChoice } from "./hero/ComparisonChoice";

type TabId = "tamano" | "pie" | "mano";
interface Tab { id: TabId; label: string; value: string; comparison: string; }
export function SizeTabs({ week }: { week: number }) {
  const info = getWeek(week);
  const limbs = limbSize(info.week);
  const showFruit = useShowComparison();
  const prefix = useId();
  const measures = [info.lengthCm ? "≈ " + formatLength(info.lengthCm) : null,
    info.weightG ? "≈ " + formatWeight(info.weightG) : null].filter(Boolean).join(" · ");
  const tabs: Tab[] = [{id:"tamano",label:"Bebé",value:measures || "Todavía sin medida",comparison:comparisonCaption(info.week) ?? ""}];
  if (limbs?.footCm) tabs.push({id:"pie",label:"Pie",value:"≈ " + formatCm(limbs.footCm),comparison:limbs.footComparison ?? ""});
  if (limbs?.handCm) tabs.push({id:"mano",label:"Mano",value:"≈ " + formatCm(limbs.handCm),comparison:limbs.handComparison ?? ""});
  const [active, setActive] = useState<TabId>("tamano");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const current = tabs.find(tab => tab.id === active) ?? tabs[0]!;
  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + tabs.length) % tabs.length;
    setActive(tabs[next]!.id); buttons.current[next]?.focus();
  }
  return <section className="rounded-card border border-line bg-white p-4" aria-labelledby={prefix+"-heading"}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={prefix+"-heading"} className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">Qué tan grande está</h2>
      <ComparisonChoice />
    </div>
    {tabs.length > 1 && <div role="tablist" aria-label="Medidas del bebé" className="mt-2.5 flex gap-2">
      {tabs.map((tab,index) => <button key={tab.id} ref={node => { buttons.current[index]=node; }} type="button" role="tab"
        id={prefix+"-"+tab.id} aria-selected={tab.id===current.id} aria-controls={prefix+"-panel"}
        tabIndex={tab.id===current.id?0:-1} onClick={()=>setActive(tab.id)} onKeyDown={event=>onKeyDown(event,index)}
        className={"min-h-[44px] rounded-tile px-3.5 text-[13px] font-extrabold "+(tab.id===current.id?"bg-pastel-celeste text-ink":"bg-pastel-arena/50 text-muted")}>{tab.label}</button>)}
    </div>}
    <div role={tabs.length>1?"tabpanel":undefined} id={prefix+"-panel"}
      aria-labelledby={tabs.length>1?prefix+"-"+current.id:undefined} className="mt-3">
      <p className="text-xl font-black text-ink">{current.value}</p>
      {current.id==="tamano" && info.lengthCm && <p className="mt-1 text-xs font-semibold text-muted">Longitud {measurementNote(info.week)}</p>}
      {showFruit && current.comparison && <p className="mt-2 text-sm font-bold text-petrol">{current.id==="tamano"?current.comparison:"Como "+current.comparison}</p>}
      {current.id==="tamano" && info.week<=3 && <p className="mt-2 text-sm text-muted">{info.week===3?"Es microscópico: todavía no tiene una comparación con frutas.":"En estas semanas todavía no hay embrión para medir."}</p>}
    </div>
    {current.id==="tamano" && switchesMeasurementAt(info.week) && <p className="mt-2 text-xs text-muted">Desde esta semana se mide de la cabeza a los pies; por eso cambia la longitud.</p>}
    {showFruit && current.id==="tamano" && current.comparison && <p className="mt-2 text-[11px] leading-relaxed text-muted">Las frutas son referencias ilustrativas y varían. Una misma fruta puede aparecer varias semanas; el crecimiento se ve en los cm y g.{info.week>=20?" Desde la semana 20, la fruta orienta sobre el peso, no la longitud.":""}</p>}
    <p className="mt-2.5 text-[11px] leading-relaxed text-muted">Son promedios aproximados. Cada bebé crece a su ritmo; tu control prenatal es la referencia para tu embarazo.</p>
  </section>;
}
