"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import type { ProviderId } from "@/lib/authConfig";

const LABELS: Record<ProviderId, string> = {
  google: "Continuar con Google",
  facebook: "Continuar con Facebook",
};

// BUILD-PLAN A2. After a successful sign-in we land on /consentimiento, which
// records explicit consent before any health data is synced — consent is never
// implied by the act of signing in (ARCHITECTURE.md §8).
const AFTER_SIGN_IN = "/consentimiento";

export function ProviderButtons({ providers }: { providers: ProviderId[] }) {
  const [pending, setPending] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(provider: ProviderId) {
    setPending(provider);
    setError(null);
    try {
      await signIn(provider, { callbackUrl: AFTER_SIGN_IN });
    } catch {
      setPending(null);
      setError("No pudimos abrir el acceso. Probá de nuevo en un momento.");
    }
  }

  return (
    <div className="space-y-2.5">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => start(provider)}
          disabled={pending !== null}
          className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-terracotta px-5 text-sm font-extrabold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending === provider ? "Abriendo…" : LABELS[provider]}
        </button>
      ))}

      {error && (
        <p role="alert" className="text-center text-sm text-terracotta">
          {error}
        </p>
      )}
    </div>
  );
}
