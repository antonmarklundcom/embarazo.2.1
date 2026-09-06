"use client";

import { useActionState } from "react";

import { toggleFlag, type FlagActionState } from "@/app/admin/flags/actions";
import type { FlagKey } from "@/lib/flags/keys";

// I5/U1 — the switch for one flag.
//
// A form per row rather than one form for the page: a flag flip takes effect
// everywhere at once and cannot be undone by not saving, so batching two of
// them behind a single "Guardar" would make one careless click change two
// things. Each row states what it is about to become before it is clicked.

export function FlagToggle({
  flagKey,
  value,
  disabled,
}: {
  flagKey: FlagKey;
  value: boolean;
  /** No database configured — the store is readable but not writable. */
  disabled?: boolean;
}) {
  const [state, submit, pending] = useActionState<FlagActionState, FormData>(
    toggleFlag,
    {},
  );

  const next = !value;

  return (
    <form action={submit} className="shrink-0 text-right">
      <input type="hidden" name="key" value={flagKey} />
      <input type="hidden" name="value" value={String(next)} />
      <button
        type="submit"
        disabled={pending || disabled}
        aria-label={`${next ? "Activar" : "Desactivar"} ${flagKey}`}
        className={`rounded-tile px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40 ${
          value
            ? "bg-sage/15 text-sage"
            : "bg-petrol text-white"
        }`}
      >
        {value ? "Desactivar" : "Activar"}
      </button>
      {state.error && (
        <p className="mt-2 text-xs font-semibold text-terracotta">{state.error}</p>
      )}
      {state.ok && (
        <p className="mt-2 text-xs font-semibold text-sage">{state.ok}</p>
      )}
    </form>
  );
}
