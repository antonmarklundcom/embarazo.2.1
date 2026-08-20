"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/lib/useProfile";
import { useT } from "@/lib/i18n/useLocale";

// Fixed bottom tab bar — "Mi Bebé" design: terracotta active state,
// white bar over line border.
//
// D4 nav IA: Hoy · Guías · Checklist · Herramientas · Cerca tuyo. Checklist
// promoted out of the tools drawer into its own tab (feature map #24);
// Eventos (and, once it ships, Beneficios) now live inside Cerca tuyo
// instead of taking a nav slot. Progreso (the 42-week grid) is reachable
// from the week hero / week detail pages, not from the nav, to keep 5 tabs.
//
// The checklist tab is mode-aware: "planeando" mode has its own checklist
// route (fertility/TTC tasks) distinct from the pregnancy one, and both are
// real Dexie-backed pages a nav tab should deep-link to directly rather than
// via an intermediate picker.
function checklistHref(mode: "embarazada" | "planeando"): string {
  return mode === "planeando" ? "/planeando/checklist" : "/herramientas/checklist";
}

export function BottomNav() {
  const pathname = usePathname();
  const { mode } = useProfile();
  // K19-L1: the five tab labels are the most-read strings in the app, which is
  // why they are the first thing the locale toggle has to move.
  const t = useT();

  const TABS = [
    { href: "/", label: t("nav.today"), icon: HomeIcon },
    { href: "/guias", label: t("nav.guides"), icon: BookIcon },
    { href: checklistHref(mode), label: t("nav.checklist"), icon: ChecklistIcon },
    { href: "/herramientas", label: t("nav.tools"), icon: ToolsIcon },
    { href: "/directorio", label: t("nav.nearby"), icon: MapIcon },
  ];

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación principal"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] transition ${
                  active ? "font-extrabold text-terracotta" : "font-bold text-muted"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon active={active} />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { active?: boolean };
const stroke = (active?: boolean) => (active ? "#C96342" : "#7A7369");

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" stroke={stroke(active)} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function BookIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4.5h6a2.5 2.5 0 0 1 2 1 2.5 2.5 0 0 1 2-1h6v14h-6a2 2 0 0 0-2 1 2 2 0 0 0-2-1H4z" stroke={stroke(active)} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 5.5v14" stroke={stroke(active)} strokeWidth="1.7" />
    </svg>
  );
}
function ChecklistIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="4" width="17" height="16" rx="2" stroke={stroke(active)} strokeWidth="1.7" />
      <path d="m6.5 9 1.6 1.6L10.5 8M6.5 15.5l1.6 1.6 2.4-2.6" stroke={stroke(active)} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 9h5M13 15.5h5" stroke={stroke(active)} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function ToolsIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14.5 5.5a3.5 3.5 0 0 0-4.9 4.4L4 15.5 8.5 20l5.6-5.6a3.5 3.5 0 0 0 4.4-4.9l-2.3 2.3-2-2z" stroke={stroke(active)} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function MapIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" stroke={stroke(active)} strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.4" stroke={stroke(active)} strokeWidth="1.7" />
    </svg>
  );
}
