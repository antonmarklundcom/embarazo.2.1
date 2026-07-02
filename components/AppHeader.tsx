"use client";

import Link from "next/link";

// App header (build spec §6): app name + Ajustes gear icon.
export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-black/5 bg-cream/90 backdrop-blur print:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <NidoMark />
          <span className="text-lg font-medium text-petrol-dark">Nido</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/emergencia"
            className="flex h-9 items-center rounded-full bg-terracotta px-3 text-xs font-medium text-white transition active:scale-95"
          >
            SOS
          </Link>
          <Link
            href="/ajustes"
            aria-label="Ajustes"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-black/5"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="3" stroke="#7E766C" strokeWidth="1.7" />
              <path
                d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7 5.3 5.3"
                stroke="#7E766C"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

function NidoMark() {
  // Simple nest/leaf mark in petrol-teal.
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M4 19c0-7 6-12 12-12s12 5 12 12c0 3-2 5-5 5H9c-3 0-5-2-5-5z"
        fill="#1F5F5B"
        fillOpacity="0.12"
      />
      <path
        d="M5 20c2.5-1.5 6-2 11-2s8.5.5 11 2"
        stroke="#1F5F5B"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="16" cy="14" r="3.2" fill="#D9714B" />
    </svg>
  );
}
