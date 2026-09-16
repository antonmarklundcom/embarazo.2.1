// W4: moved verbatim out of `app/(app)/page.tsx`.

import Link from "next/link";

import type { Role } from "@/lib/db";

import { HomeSkeleton } from "./HomeSkeleton";

/**
 * K9-F5 — pregnancy mode, no pregnancy.
 *
 * Two people land here and they need opposite things. A companion has no dates
 * of his own and never will: what he is missing is the connection, so he is
 * pointed at Familia and at his code. A mamá in this state has lost or never
 * finished her own dates, and what she needs is the field that sets them.
 *
 * `loading` matters because for a companion this is usually a half-second gap
 * before the shared view lands, and telling him his invitation did not work
 * while it is still in flight would be wrong more often than right.
 */
export function NoPregnancyYet({ role, loading }: { role: Role; loading: boolean }) {
  if (loading) return <HomeSkeleton />;

  const companion = role !== "mama";
  return (
    <div className="space-y-4 py-6">
      <section className="rounded-card border border-line bg-white p-5">
        <h1 className="text-xl font-black text-ink">
          {companion ? "Todavía no te conectamos" : "Falta tu fecha"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {companion
            ? "Para seguir un embarazo desde acá necesitás el código que te pasaron, o que quien te invitó vuelva a mandártelo. Si ya lo usaste, puede que estés sin internet en este momento."
            : "Guardamos tu perfil pero no la fecha de tu embarazo. Poniéndola volvés a ver tu semana, tu fecha probable de parto y todo lo demás."}
        </p>
        <Link
          href={companion ? "/familia" : "/ajustes"}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-tile bg-petrol px-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
        >
          {companion ? "Ir a Familia" : "Poner mi fecha"}
        </Link>
      </section>
      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-base font-extrabold text-ink">Mientras tanto</h2>
        <p className="mt-1 text-sm text-muted">
          Las guías, el directorio y las herramientas funcionan igual.
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/guias"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-tile bg-cream text-sm font-extrabold text-petrol"
          >
            Guías
          </Link>
          <Link
            href="/herramientas"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-tile bg-cream text-sm font-extrabold text-petrol"
          >
            Herramientas
          </Link>
        </div>
      </section>
    </div>
  );
}
