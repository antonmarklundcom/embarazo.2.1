"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/brand";
import { useT } from "@/lib/i18n/useLocale";

// App header — brand circle mark + 900 wordmark, terracotta SOS pill and a
// round Ajustes button. 17 Oct 2026: on Hoy it starts transparent so the hero's
// theme runs up to the top of the screen, and turns white once the page
// scrolls. Every other screen keeps the white bar.
export function AppHeader() {
  const t = useT();
  const pathname = usePathname();
  const immersive = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!immersive) return;
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [immersive]);

  const clear = immersive && !scrolled;

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors duration-200 print:hidden ${
        clear ? "border-transparent bg-transparent md:border-line md:bg-white/95 md:backdrop-blur" : "border-line bg-white/95 backdrop-blur"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <a
        href="#main-content"
        className="sr-only z-50 rounded-full bg-petrol px-5 py-3 font-bold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-2"
      >
        Ir al contenido
      </a>
      <div className="mx-auto flex h-[4.75rem] max-w-3xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-full">
          <BrandMark />
          <span className="text-[19px] font-black tracking-tight text-ink">
            {APP_NAME}
          </span>
        </Link>
        <div className="flex min-h-11 items-center gap-2.5 rounded-full">
          <Link
            href="/emergencia"
            className="flex h-11 items-center gap-1.5 rounded-full bg-terracotta px-4 text-sm font-black tracking-wide text-white shadow-soft transition hover:bg-[#9d452e] active:scale-95"
          >
            {t("header.emergency")}
          </Link>
          <Link
            href="/ajustes"
            aria-label={t("header.settings")}
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-muted transition hover:bg-black/5 ${
              clear ? "border-white/70 bg-white/70 backdrop-blur md:border-line md:bg-white" : "border-line bg-white"
            }`}
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
