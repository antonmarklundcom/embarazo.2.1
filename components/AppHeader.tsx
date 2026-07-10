"use client";

import Link from "next/link";

// App header — "Mi Bebé" design 1a: brand circle mark + 900 wordmark,
// terracotta SOS pill, bordered round Ajustes button.
export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur print:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[19px] font-black tracking-tight text-ink">
            Nido
          </span>
        </Link>
        <div className="flex items-center gap-2.5">
          <Link
            href="/emergencia"
            className="flex h-9 items-center rounded-full bg-terracotta px-3.5 text-xs font-black tracking-wide text-white transition active:scale-95"
          >
            SOS
          </Link>
          <Link
            href="/ajustes"
            aria-label="Ajustes"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:bg-black/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="3" stroke="#322E29" strokeWidth="1.7" />
              <path
                d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7 5.3 5.3"
                stroke="#322E29"
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

function BrandMark() {
  // Nest mark, cream stroke on solid brand-green circle (design 1a header).
  return (
    <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-petrol">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FBF7F1"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 15c0-4.5 3.5-8 8-8s8 3.5 8 8" />
        <path d="M4 15c2.5 1.6 5.2 2.5 8 2.5s5.5-.9 8-2.5" />
        <circle cx="12" cy="5" r="1.6" />
      </svg>
    </span>
  );
}
