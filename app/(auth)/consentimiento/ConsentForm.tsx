"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { declineConsent } from "./actions";

// BUILD-PLAN A2. The checkbox exists so accepting is an action rather than a
// side effect of landing on the page.
export function ConsentForm({ action }: { action: () => Promise<void> }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="space-y-3">
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-card border border-line bg-white p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#C96342]"
        />
        <span className="text-sm leading-relaxed text-ink">
          Estoy de acuerdo con que Mi Bebé guarde mi información de salud en mi
          cuenta.
        </span>
      </label>

      <form action={action}>
        <AcceptButton disabled={!agreed} />
      </form>

      <form action={declineConsent}>
        <button
          type="submit"
          className="min-h-[44px] w-full text-sm font-extrabold text-petrol"
        >
          Ahora no — seguir sin cuenta
        </button>
      </form>
    </div>
  );
}

function AcceptButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="min-h-[52px] w-full rounded-full bg-terracotta px-5 text-sm font-extrabold text-white transition active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Confirmar y continuar"}
    </button>
  );
}
