// W4: the "Herramientas" section of "Hoy", moved verbatim out of
// `app/(app)/page.tsx` with the tile it is the only caller of.

import Link from "next/link";

// D1: one icon set, shared with the herramientas grid so the two cannot drift.
import { ToolIcon, type ToolIconName } from "@/components/ToolIcon";

export function HomeToolsGrid() {
  return (
    <section aria-labelledby="herramientas" className="space-y-2.5 pt-1">
      <h2
        id="herramientas"
        className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
      >
        Herramientas
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <ToolCard href="/herramientas/pataditas" title="Pataditas" subtitle="Contá movimientos" icon="feet" />
        <ToolCard href="/herramientas/contracciones" title="Contracciones" subtitle="Cronometrá" icon="timer" />
        <ToolCard href="/herramientas/peso" title="Peso" subtitle="Seguí tu progreso" icon="scale" />
        <ToolCard href="/herramientas/fotos" title="Fotos" subtitle="Diario de tu panza" icon="camera" />
        <ToolCard href="/herramientas/comer" title="¿Puedo comer...?" subtitle="Buscá un alimento" icon="food" />
      </div>
    </section>
  );
}

function ToolCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: ToolIconName;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-card border border-line bg-white p-3.5 transition active:scale-[0.98]"
    >
      <ToolIcon name={icon} />
      <div className="min-w-0">
        <p className="text-[15px] font-extrabold text-ink">{title}</p>
        <p className="truncate text-xs font-semibold text-muted">{subtitle}</p>
      </div>
    </Link>
  );
}
