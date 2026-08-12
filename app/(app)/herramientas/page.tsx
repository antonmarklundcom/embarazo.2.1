import Link from "next/link";
import { PUBLISHED_VIDEOS } from "@/lib/seed/videos";

const TOOLS = [
  {
    href: "/emergencia",
    title: "Emergencia",
    desc: "Números de emergencia, señales de alarma y tus contactos, sin internet.",
  },
  {
    href: "/herramientas/resumen",
    title: "Resumen para mi control",
    desc: "Organizá tus datos en una hoja para mostrarle a tu médico/a.",
  },
  {
    href: "/herramientas/comer",
    title: "¿Puedo comer...?",
    desc: "Buscá un alimento o bebida y mirá si podés comerlo, con qué cuidado.",
  },
  {
    href: "/herramientas/carne",
    title: "Carné perinatal",
    desc: "Llevá una copia en fotos de tu carné y tus datos clave, siempre con vos.",
  },
  {
    href: "/derechos",
    title: "Tus derechos y beneficios",
    desc: "Licencia, subsidio de IPS, gratuidad y ayudas: qué te corresponde según tu situación.",
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
    href: "/guias",
    title: "Guías",
    desc: "Artículos sobre el embarazo, revisados y pensados para Paraguay.",
  },
];

export default function HerramientasPage() {
  // The video gallery is hidden until real videos.ts entries replace the
  // placeholder YouTube IDs (see lib/seed/videos.ts).
  const tools = PUBLISHED_VIDEOS.length > 0
    ? [
        ...TOOLS,
        {
          href: "/guias/videos",
          title: "Videos",
          desc: "Galería de videos educativos, filtrable por tema y trimestre.",
        },
      ]
    : TOOLS;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Herramientas</h1>
        <p className="text-sm text-muted">
          Todo funciona sin internet y se guarda solo en tu teléfono.
        </p>
      </header>
      <div className="space-y-3">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="block rounded-card bg-white p-4 shadow-soft transition active:scale-[0.99]"
          >
            <h2 className="text-base font-extrabold text-ink">{t.title}</h2>
            <p className="mt-1 text-sm text-muted">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
