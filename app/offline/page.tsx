import Link from "next/link";
import { EMERGENCY_NUMBERS } from "@/lib/emergency";

// Offline navigation fallback (build spec §9). Served by the service worker
// (see app/sw.ts) when a page that isn't precached is requested with no
// network. Deliberately standalone — no app shell dependency, since it must
// work even when nothing else can load.
//
// This is also the page a woman lands on when she has no signal and the thing
// she tapped was not precached — which is exactly when the emergency screen
// matters most and is hardest to find (the header's SOS button is part of the
// app shell this page does without). So the way to /emergencia (precached,
// see app/sw.ts) comes first, above "Ir a Inicio", and 141 / 911 are right
// here as tap-to-call links: a phone call needs no data connection at all.
//
// The emergency link is a plain `<a>`, not `<Link>`, on purpose. A `<Link>`
// navigation fetches the route's RSC payload, which is not what the precache
// holds — offline, that fetch fails before the service worker can answer. A
// full document navigation is what the precache serves.
export const metadata = {
  title: "Sin conexión",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream px-6 text-center text-ink">
      <span className="text-3xl" aria-hidden>
        📡
      </span>
      <div>
        <h1 className="text-lg font-black text-ink">
          Estás sin conexión
        </h1>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Esta página necesita internet la primera vez. Tu semana, tus
          herramientas y las guías ya descargadas siguen funcionando sin
          conexión.
        </p>
      </div>
      <a
        href="/emergencia"
        className="min-h-[44px] w-full max-w-xs rounded-tile bg-terracotta px-4 py-2.5 text-center text-sm font-extrabold leading-[1.9] text-white transition active:scale-[0.98]"
      >
        Emergencia: señales de alarma y contactos
      </a>
      <div className="flex w-full max-w-xs gap-2">
        {EMERGENCY_NUMBERS.map((n) => (
          <a
            key={n.number}
            href={`tel:${n.number}`}
            className="min-h-[44px] flex-1 rounded-tile border border-terracotta bg-white px-3 py-2 text-center text-terracotta transition active:scale-[0.98]"
          >
            <span className="block text-lg font-black">{n.number}</span>
            <span className="block text-[11px] font-bold">{n.name}</span>
          </a>
        ))}
      </div>
      <Link
        href="/"
        className="min-h-[44px] w-full max-w-xs rounded-tile bg-petrol px-4 py-2.5 text-center text-sm font-medium leading-[1.9] text-white transition active:scale-[0.98]"
      >
        Ir a Inicio
      </Link>
    </div>
  );
}
