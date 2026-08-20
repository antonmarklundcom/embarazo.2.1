import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/server/admin";

// BUILD-PLAN A7 — the /admin shell.
//
// The guard runs in the layout, so it covers every current and future route in
// this group by construction rather than by each page remembering. A page that
// forgets to call it still cannot render, because this layout never resolves
// for a non-admin.
//
// This route group deliberately sits OUTSIDE `(app)` — no AppHeader, no
// BottomNav, no SOS pill. The panel is a different product for a different
// person, and an admin screen wearing the app's navigation invites a founder
// to think they are looking at what a user sees.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // Deliberately NO `title`. Next resolves a segment's static metadata even
  // when the layout below throws notFound(), so a title here would put
  // "Panel · Mi Bebé" in the <title> of the 404 that a stranger receives —
  // confirming the route exists, which is the one thing §9 says not to do.
  // Without it the 404 is byte-identical in every visible way to any other.
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Throws notFound() for anyone who is not an administrator — a 404, never a
  // 403 (ARCHITECTURE.md §9: do not confirm the route exists).
  const actor = await requireAdmin();

  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-baseline gap-4">
            <Link href="/admin" className="text-[15px] font-black text-ink">
              Mi Bebé · Panel
            </Link>
            {/* K16 — the panel has a second page now. */}
            <Link
              href="/admin/metricas"
              className="text-[13px] font-extrabold text-petrol"
            >
              Métricas
            </Link>
            {/* K20 — the moderation queue. */}
            <Link
              href="/admin/preguntas"
              className="text-[13px] font-extrabold text-petrol"
            >
              Preguntas
            </Link>
          </div>
          <p className="truncate text-xs text-muted">{actor.email}</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-10">
        <p className="text-[11px] leading-relaxed text-muted">
          Este panel muestra <strong>solo datos de cuenta</strong>: fechas,
          cantidades y estado. Nunca muestra el contenido de los registros de
          salud de una usuaria, ni siquiera para dar soporte. Cada acción queda
          registrada con tu nombre.
        </p>
      </footer>
    </div>
  );
}
