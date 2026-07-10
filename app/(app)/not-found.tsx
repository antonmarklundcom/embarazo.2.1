import Link from "next/link";

// 404 within the app shell (keeps AppHeader/BottomNav via app/(app)/layout.tsx).
export default function AppNotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-3xl" aria-hidden>
        🔎
      </span>
      <div>
        <h1 className="text-lg font-black text-ink">
          No encontramos esa página
        </h1>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Puede que el enlace esté vencido o mal escrito.
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
