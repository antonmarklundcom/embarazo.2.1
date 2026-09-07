"use client";

import { useActionState } from "react";

import { toggleFlag, type FlagActionState } from "@/app/admin/flags/actions";

// I4 — the one control this panel has: pause the AI baby feature.
//
// This calls the exact same server action `/admin/flags` uses
// (`toggleFlag`), not a second one — `setFlag` is the only place that writes
// the flag row and the audit row, in one transaction, and this reuses it
// rather than opening a second write path with its own copy of that
// guarantee (see `lib/server/flags.ts`). Only
// the labels are specific to this screen: "Pausar"/"Reanudar" reads right
// here, where `FlagToggle`'s generic "Activar"/"Desactivar" would not.

export function AiSpendControls({
  paused,
  disabled,
}: {
  paused: boolean;
  /** No database configured — the flag is readable but not writable. */
  disabled?: boolean;
}) {
  const [state, submit, pending] = useActionState<FlagActionState, FormData>(
    toggleFlag,
    {},
  );

  const next = !paused;

  return (
    <form action={submit} className="shrink-0 text-right">
      <input type="hidden" name="key" value="ai_baby_paused" />
      <input type="hidden" name="value" value={String(next)} />
      <button
        type="submit"
        disabled={pending || disabled}
        aria-label={paused ? "Reanudar la generación con IA" : "Pausar la generación con IA"}
        className={`rounded-tile px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40 ${
          paused ? "bg-sage/15 text-sage" : "bg-terracotta text-white"
        }`}
      >
        {paused ? "Reanudar" : "Pausar"}
      </button>
      {state.error && (
        <p className="mt-2 text-xs font-semibold text-terracotta">{state.error}</p>
      )}
      {state.ok && <p className="mt-2 text-xs font-semibold text-sage">{state.ok}</p>}
    </form>
  );
}
