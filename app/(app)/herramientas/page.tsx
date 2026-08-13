import Link from "next/link";
import { PUBLISHED_VIDEOS } from "@/lib/seed/videos";
import { ToolIcon, type ToolIconName } from "@/components/ToolIcon";

// BUILD-PLAN D1 — illustrated tools grid (feature map #20).
//
// This screen was eleven stacked text cards, each with a title and a sentence:
// a wall of prose you read rather than a set of things you reach for. The grid
// is three per row, so the whole toolbox is visible on one phone screen without
// scrolling, and each tool is found by shape and colour before it is read.
//
// The sentences are not deleted — they move into `sr-only` text, so a screen
// reader still gets "Cronómetro de contracciones: medí duración e intervalo
// cuando empiecen las contracciones" while a sighted user gets a tile.

interface Tool {
  href: string;
  title: string;
  desc: string;
  icon: ToolIconName;
  tone: string;
}

const TOOLS: Tool[] = [
  {
    href: "/emergencia",
    title: "Emergencia",
    desc: "Números de emergencia, señales de alarma y tus contactos, sin internet.",
    icon: "emergency",
    tone: "bg-pastel-rosa",
  },
  {
    href: "/herramientas/comer",
    title: "¿Puedo comer…?",
    desc: "Buscá un alimento o bebida y mirá si podés comerlo, con qué cuidado.",
    icon: "food",
    tone: "bg-pastel-salvia",
  },
  {
    href: "/herramientas/carne",
    title: "Carné perinatal",
    desc: "Llevá una copia en fotos de tu carné y tus datos clave, siempre con vos.",
    icon: "carne",
    tone: "bg-pastel-celeste",
  },
  {
    href: "/herramientas/nombres",
    title: "Nombres",
    desc: "Nombres en guaraní, español y bíblicos, con su significado. Guardá tus favoritos.",
    icon: "names",
    tone: "bg-pastel-lavanda",
  },
  {
    href: "/herramientas/kegel",
    title: "Kegel",
    desc: "Ejercicios de piso pélvico, con el tiempo contado por vos.",
    icon: "kegel",
    tone: "bg-pastel-rosa",
  },
  {
    href: "/herramientas/pataditas",
    title: "Pataditas",
    desc: "Registrá los movimientos de tu bebé y conocé su ritmo.",
    icon: "feet",
    tone: "bg-pastel-arena",
  },
  {
    href: "/herramientas/contracciones",
    title: "Contracciones",
    desc: "Medí duración e intervalo cuando empiecen las contracciones.",
    icon: "timer",
    tone: "bg-pastel-lavanda",
  },
  {
    href: "/herramientas/sintomas",
    title: "Síntomas y ánimo",
    desc: "Registrá cómo te sentís y tus síntomas, día a día.",
    icon: "symptoms",
    tone: "bg-pastel-rosa",
  },
  {
    href: "/herramientas/peso",
    title: "Peso",
    desc: "Seguí tu evolución con un gráfico simple.",
    icon: "scale",
    tone: "bg-pastel-celeste",
  },
  {
    href: "/herramientas/fotos",
    title: "Diario de fotos",
    desc: "Seguí el crecimiento de tu panza, solo en tu teléfono.",
    icon: "camera",
    tone: "bg-pastel-salvia",
  },
  {
    href: "/herramientas/sueno",
    title: "Sueño",
    desc: "Anotá cómo dormís y llevá la semana a tu control.",
    icon: "sleep",
    tone: "bg-pastel-celeste",
  },
  {
    href: "/herramientas/diario",
    title: "Diario",
    desc: "Escribí lo que quieras guardar de estos meses, cifrado con tu PIN.",
    icon: "diary",
    tone: "bg-pastel-salvia",
  },
  {
    href: "/herramientas/dental",
    title: "Salud dental",
    desc: "Encías que sangran, qué se puede hacer en el dentista y cuándo consultar.",
    icon: "dental",
    tone: "bg-pastel-arena",
  },
  {
    href: "/herramientas/resumen",
    title: "Resumen del control",
    desc: "Organizá tus datos en una hoja para mostrarle a tu médico/a.",
    icon: "summary",
    tone: "bg-pastel-arena",
  },
  {
    href: "/derechos",
    title: "Tus derechos",
    desc: "Licencia, subsidio de IPS, gratuidad y ayudas: qué te corresponde según tu situación.",
    icon: "rights",
    tone: "bg-pastel-lavanda",
  },
  {
    href: "/guias",
    title: "Guías",
    desc: "Artículos sobre el embarazo, revisados y pensados para Paraguay.",
    icon: "guides",
    tone: "bg-pastel-celeste",
  },
];

const VIDEOS: Tool = {
  href: "/guias/videos",
  title: "Videos",
  desc: "Galería de videos educativos, filtrable por tema y trimestre.",
  icon: "video",
  tone: "bg-pastel-rosa",
};

export default function HerramientasPage() {
  // The video gallery stays hidden until real entries replace the placeholder
  // YouTube ids (Z1, `lib/seed/videos.ts`).
  const tools = PUBLISHED_VIDEOS.length > 0 ? [...TOOLS, VIDEOS] : TOOLS;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Herramientas</h1>
        <p className="text-sm text-muted">
          Todo funciona sin internet y se guarda solo en tu teléfono.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="flex min-h-[112px] flex-col items-center justify-start gap-2 rounded-card border border-line bg-white p-3 text-center transition active:scale-[0.97]"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full ${tool.tone}`}
            >
              <ToolIcon name={tool.icon} />
            </span>
            <span className="text-[12px] font-extrabold leading-tight text-ink">
              {tool.title}
            </span>
            {/* Kept for screen readers and for anyone who needs the sentence. */}
            <span className="sr-only">{tool.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
