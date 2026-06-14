import Link from "next/link";

const TOOLS = [
  {
    href: "/herramientas/resumen",
    title: "Resumen para mi control",
    desc: "Organizá tus datos en una hoja para mostrarle a tu médico/a.",
  },
  {
    href: "/herramientas/sintomas",
    title: "Síntomas y ánimo",
    desc: "Registrá cómo te sentís y tus síntomas, día a día.",
  },
  {
    href: "/herramientas/fotos",
    title: "Diario de fotos",
    desc: "Seguí el crecimiento de tu panza, solo en tu teléfono.",
  },
  {
    href: "/herramientas/pataditas",
    title: "Contador de pataditas",
    desc: "Registrá los movimientos de tu bebé y conocé su ritmo.",
  },
  {
    href: "/herramientas/contracciones",
    title: "Cronómetro de contracciones",
    desc: "Medí duración e intervalo cuando empiecen las contracciones.",
  },
  {
    href: "/herramientas/peso",
    title: "Registro de peso",
    desc: "Seguí tu evolución con un gráfico simple.",
  },
  {
    href: "/herramientas/checklist",
    title: "Checklists",
    desc: "Bolso para el sanatorio y trámites después del nacimiento.",
  },
  {
    href: "/guias",
    title: "Guías",
    desc: "Artículos sobre el embarazo, revisados y pensados para Paraguay.",
  },
  {
    href: "/guias/videos",
    title: "Videos",
    desc: "Galería de videos educativos, filtrable por tema y trimestre.",
  },
];

export default function HerramientasPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-medium text-petrol-dark">Herramientas</h1>
        <p className="text-sm text-muted">
          Todo funciona sin internet y se guarda solo en tu teléfono.
        </p>
      </header>
      <div className="space-y-3">
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="block rounded-card bg-white p-4 shadow-soft transition active:scale-[0.99]"
          >
            <h2 className="text-base font-medium text-ink">{t.title}</h2>
            <p className="mt-1 text-sm text-muted">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
