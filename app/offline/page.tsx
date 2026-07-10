import Link from "next/link";

// Offline navigation fallback (build spec §9). Served by the service worker
// (see app/sw.ts) when a page that isn't precached is requested with no
// network. Deliberately standalone — no app shell dependency, since it must
// work even when nothing else can load.
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
      <Link
        href="/"
        className="min-h-[44px] w-full max-w-xs rounded-tile bg-petrol px-4 py-2.5 text-center text-sm font-medium leading-[1.9] text-white transition active:scale-[0.98]"
      >
        Ir a Inicio
      </Link>
    </div>
  );
}
