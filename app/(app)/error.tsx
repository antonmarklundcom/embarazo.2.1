"use client";

import { useEffect } from "react";
import Link from "next/link";

// Catches runtime errors within the app shell (build spec §4/§6). The
// AppHeader/BottomNav from app/(app)/layout.tsx stay mounted around this, so
// the user never sees a blank white screen.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-3xl" aria-hidden>
        😕
      </span>
      <div>
        <h1 className="text-lg font-black text-ink">
          Algo salió mal
        </h1>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Tus datos están a salvo en tu teléfono. Probá de nuevo; si sigue
          pasando, cerrá y volvé a abrir la app.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="min-h-[44px] w-full rounded-tile bg-cream px-4 py-2.5 text-center text-sm font-medium text-petrol"
        >
          Ir a Inicio
        </Link>
      </div>
    </div>
  );
}
