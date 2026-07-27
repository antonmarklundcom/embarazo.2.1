import Link from "next/link";

// BUILD-PLAN C8 (FEATURE-MAP #18). Quick actions high on the home screen.
//
// Preggers uses this slot for a partner invite. Ours holds the three things a
// pregnant woman in Paraguay reaches for under pressure: the emergency screen,
// her carné, and her next appointment.

const SHORTCUTS = [
  {
    href: "/emergencia",
    label: "Emergencia",
    tone: "bg-pastel-rosa",
    icon: (
      <path
        d="M12 3.5 3.5 19h17L12 3.5Zm0 5.5v4.5m0 3h.01"
        stroke="#322E29"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/herramientas/carne",
    label: "Mi carné",
    tone: "bg-pastel-celeste",
    icon: (
      <>
        <rect
          x="4"
          y="3.5"
          width="16"
          height="17"
          rx="2"
          stroke="#322E29"
          strokeWidth="1.7"
        />
        <path
          d="M8 8h8M8 12h8M8 16h5"
          stroke="#322E29"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    href: "/herramientas/resumen",
    label: "Mi resumen",
    tone: "bg-pastel-salvia",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" stroke="#322E29" strokeWidth="1.7" />
        <path
          d="M12 7.5V12l3 2"
          stroke="#322E29"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
];

export function Shortcuts() {
  return (
    <nav aria-label="Accesos rápidos">
      <ul className="flex gap-2.5">
        {SHORTCUTS.map((s) => (
          <li key={s.href} className="flex-1">
            <Link
              href={s.href}
              className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-card ${s.tone} px-2 py-3 transition active:scale-[0.97]`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {s.icon}
              </svg>
              <span className="text-center text-xs font-extrabold leading-tight text-ink">
                {s.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
