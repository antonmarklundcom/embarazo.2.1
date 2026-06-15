"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Fixed bottom tab bar (build spec §6). ≥44px targets, petrol-teal active state.
const TABS = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/progreso", label: "Progreso", icon: TimelineIcon },
  { href: "/herramientas", label: "Herramientas", icon: ToolsIcon },
  { href: "/directorio", label: "Cerca tuyo", icon: MapIcon },
  { href: "/eventos", label: "Eventos", icon: CalendarIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 backdrop-blur print:hidden"
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
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] transition ${
                  active ? "text-petrol" : "text-muted"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon active={active} />
                <span className={active ? "font-medium" : ""}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { active?: boolean };
const stroke = (active?: boolean) => (active ? "#1F5F5B" : "#7E766C");

function HomeIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" stroke={stroke(active)} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function TimelineIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 3v18M6 7h6a3 3 0 0 1 0 6H6M6 17h9" stroke={stroke(active)} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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
function CalendarIcon({ active }: IconProps) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke={stroke(active)} strokeWidth="1.7" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" stroke={stroke(active)} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
