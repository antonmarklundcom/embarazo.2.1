"use client";
import { useState } from "react";
import { comparisonMode, comparisonVisible, type ComparisonMode } from "@/lib/hero/comparisonMode";
import { setShowComparison, useShowComparison } from "@/lib/hero/preferences";

export function ComparisonChoice({ ink = "dark" }: { ink?: "dark" | "light" }) {
  const mode = comparisonMode(useShowComparison());
  const [error, setError] = useState(false);
  async function choose(next: ComparisonMode) {
    setError(false);
    try { await setShowComparison(comparisonVisible(next)); }
    catch { setError(true); }
  }
  return <div>
    <div role="group" aria-label="Cómo ver el tamaño de tu bebé" className={
      "inline-flex gap-1 rounded-full p-1 " + (ink === "light" ? "bg-white/15" : "bg-white/80")
    }>
      {([["fruits", "Frutas"], ["measures", "Medidas"]] as const).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={mode === id} onClick={() => void choose(id)}
          className={"min-h-[44px] rounded-full px-4 text-xs font-extrabold transition " + (
            mode === id ? "bg-petrol text-white shadow-sm" : ink === "light" ? "text-white" : "text-petrol"
          )}>{label}</button>
      )}
    </div>
    {error && <p role="status" className="mt-1 text-xs">No pudimos guardar tu elección. Probá otra vez.</p>}
  </div>;
}
