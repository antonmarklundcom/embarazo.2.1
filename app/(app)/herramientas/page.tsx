import { ToolsAccountFooter } from "@/components/ToolsAccountFooter";
import { PUBLISHED_VIDEOS } from "@/lib/seed/videos";
import { PUBLISHED_EJERCICIOS } from "@/lib/seed/ejercicios";
import type { ToolIconName } from "@/components/ToolIcon";
import { ToolsGrid } from "@/components/herramientas/ToolsGrid";
import { PUBLISHED_FOOD } from "@/lib/seed/food";
import { PUBLISHED_PRICES } from "@/lib/seed/prices";
import { isConfigured as isAiBabyConfigured } from "@/lib/server/aiBaby";

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
  /**
   * False when nothing is published behind the destination yet. A tile either
   * works or is absent: there is no "coming soon" tile. It comes back by itself the
   * day the seed has published entries.
   */
  published?: boolean;
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
    published: PUBLISHED_FOOD.length > 0,
  },
  {
    // K10 — placed right after the food lookup, the other "answer a question
    // nobody will answer straight" tool, and above the practical ones. It
    // renders its own empty state until a reviewer signs the figures off, so
    // the tile leads somewhere honest from the day it ships.
    href: "/herramientas/precios",
    title: "¿Cuánto cuesta?",
    desc: "Ecografía, parto, cesárea y laboratorio: qué se paga en IPS, en el público y en privado.",
    icon: "price",
    tone: "bg-pastel-arena",
    published: PUBLISHED_PRICES.length > 0,
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
    href: "/herramientas/ejercicios",
    title: "Ejercicios",
    desc: "Ejercicios suaves para el embarazo, paso a paso con fotos.",
    icon: "exercise",
    tone: "bg-pastel-salvia",
    // D6 — absent until real step photos replace the placeholder.
    published: PUBLISHED_EJERCICIOS.length > 0,
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
    desc: "Seguí el crecimiento de tu panza, semana a semana.",
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
    title: "Preparar mi control",
    desc: "Preguntas para tu semana y tus datos en una hoja para mostrarle a tu médico/a.",
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
  // K7 (§7) — two screens that shipped and were reachable from nowhere. The
  // AI portrait had a route, a quota, a consent step and an e2e spec, and no
  // link; `/preguntas` was precached for offline reading and linked only from
  // the footer of one other page. "A shipped feature linked from nowhere is a
  // bug" is the review's phrasing, and this is the grid where a user goes
  // looking for what the app can do.
  {
    href: "/preguntas",
    title: "Preguntas",
    desc: "Quién ve tus datos, si hace falta una cuenta y quién revisa lo médico.",
    icon: "faq",
    tone: "bg-pastel-arena",
  },
  {
    href: "/herramientas/bebe-ia",
    title: "Así podría ser",
    desc: "Una imagen generada de cómo podría ser tu bebé. Es un juego, no una predicción.",
    icon: "ai",
    tone: "bg-pastel-lavanda",
    // Absent while the feature is off (`/api/v1/ai/baby` answers 404 then).
    // This page is static, so the value is decided when the app is built:
    // switching AI_BABY_ENABLED on needs a redeploy for the tile to appear.
    // The route itself stays reachable by URL either way.
    published: isAiBabyConfigured(),
  },
];

// The video gallery appears once real entries replace the placeholder YouTube
// ids (Z1, `lib/seed/videos.ts`); until then there is no tile.
const VIDEOS: Tool = {
  href: "/guias/videos",
  title: "Videos",
  desc: "Galería de videos educativos, filtrable por tema y trimestre.",
  icon: "video",
  tone: "bg-pastel-rosa",
  published: PUBLISHED_VIDEOS.length > 0,
};

// Flo benchmark (2026-10-17): the same tiles, sorted into three shelves so the
// urgent ones are found first, and painted in their own colour instead of a
// white card with a coloured dot. Still three per row; every tool keeps its
// sentence for screen readers. A tool missing from GROUPS lands in the last
// shelf, so adding one never hides it.
const GROUPS: { title: string; hrefs: string[] }[] = [
  {
    title: "Para ahora",
    hrefs: ["/emergencia", "/herramientas/contracciones", "/herramientas/pataditas", "/herramientas/sintomas", "/herramientas/comer", "/herramientas/resumen"],
  },
  {
    title: "Tu seguimiento",
    hrefs: ["/herramientas/peso", "/herramientas/fotos", "/herramientas/diario", "/herramientas/sueno", "/herramientas/carne", "/herramientas/kegel", "/herramientas/ejercicios", "/herramientas/dental"],
  },
  { title: "Para saber y preparar", hrefs: [] },
];

function groupTools(tools: Tool[]): { title: string; tools: Tool[] }[] {
  const placed = new Set<string>();
  const groups = GROUPS.map((group) => {
    const members = group.hrefs
      .map((href) => tools.find((tool) => tool.href === href))
      .filter((tool): tool is Tool => Boolean(tool));
    members.forEach((tool) => placed.add(tool.href));
    return { title: group.title, tools: members };
  });
  groups[groups.length - 1]!.tools.push(...tools.filter((tool) => !placed.has(tool.href)));
  return groups.filter((group) => group.tools.length > 0);
}

export default function HerramientasPage() {
  const groups = groupTools([...TOOLS, VIDEOS].filter((tool) => tool.published !== false));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Herramientas</h1>
        {/* K18 — "todo funciona sin internet y se guarda solo en tu teléfono"
            stopped being true twice over: with an account these tools sync
            (A3), and "Así podría ser" needs the network by definition. A
            blanket claim on the screen that lists the exceptions is the kind
            of small dishonesty Phase K exists to clear out. */}
        <p className="text-sm text-muted">
          Casi todo funciona sin internet. Con cuenta, lo que anotás se copia
          para que no lo pierdas.
        </p>
      </header>

      <ToolsGrid groups={groups} />
      <ToolsAccountFooter />
    </div>
  );
}
