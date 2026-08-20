"use client";

import { useEffect, useState } from "react";

import { fetchAuthStatus } from "@/lib/auth/status";

// K18 — the line that told ten screens the same thing, and was wrong on all of
// them once the user signed in.
//
// It read "Tus datos quedan en tu teléfono." full stop, on `/herramientas/
// sintomas`, `/carne`, `/fotos`, `/resumen`, the planeando screens, Hoy and
// Ajustes. Before accounts that was the whole truth. After K1 (accounts), A3
// (sync) and K4 (photo backup) it is true for a signed-out user and false for
// a signed-in one — and it is placed exactly where a user goes looking for
// reassurance before typing something private, which is the worst place in the
// app to say something that is not true.
//
// It is now two sentences, one per state, and it says the same *useful* thing
// either way: where this ends up. The signed-in one is deliberately not a
// hedge ("puede que se sincronice") — it states the arrangement, because a
// vague privacy line is read as a worse promise than an honest specific one.
//
// **It never renders "quedan en tu teléfono" while the answer is unknown.**
// The first paint is the reassuring claim, and a claim that is retracted a
// beat later is worse than one that arrives a beat late. So it renders nothing
// until it knows — which offline, with no account, resolves to the local
// answer via `LOCAL_ONLY` anyway.

const SHIELD = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"
      stroke="#8FAE86"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="m9 12 2 2 4-4"
      stroke="#8FAE86"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function PrivacyLine({ className = "" }: { className?: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchAuthStatus().then((status) => {
      if (alive) setSignedIn(status.signedIn);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (signedIn === null) return null;

  return (
    <p className={`flex items-center gap-1.5 text-xs text-muted ${className}`}>
      {SHIELD}
      {signedIn
        ? "Se guarda en tu teléfono y se copia a tu cuenta. Tus fotos, solo si activás la copia."
        : "Sin cuenta: tus datos quedan en este teléfono."}
    </p>
  );
}
