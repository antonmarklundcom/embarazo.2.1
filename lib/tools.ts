// Tool catalogue (BUILD-PLAN D1 / FEATURE-MAP #20).
//
// Split out of the page so the home screen and the tools tab can render the
// same list without drifting apart, and so the grid's data is testable.
//
// Each tool carries a pastel tone rather than an illustration file: the
// illustrations are a founder asset (CONTENT-INVENTORY §2), and a grid of
// coloured tiles reads far better than a grid of broken images while they are
// missing.

export type ToolTone =
  | "rosa"
  | "celeste"
  | "salvia"
  | "lavanda"
  | "arena";

export interface Tool {
  href: string;
  title: string;
  /** Shown in the list view; the grid shows the title only. */
  desc: string;
  tone: ToolTone;
  /** Hidden from partner/family roles — these record the mother's own data. */
  ownerOnly?: boolean;
}

export const TOOLS: Tool[] = [
  {
    href: "/emergencia",
    title: "Emergencia",
    desc: "Números de emergencia, señales de alarma y tus contactos, sin internet.",
    tone: "rosa",
  },
  {
    href: "/herramientas/sintomas",
    title: "Síntomas y ánimo",
    desc: "Registrá cómo te sentís y tus síntomas, día a día.",
    tone: "lavanda",
    ownerOnly: true,
  },
  {
    href: "/herramientas/pataditas",
    title: "Pataditas",
    desc: "Registrá los movimientos de tu bebé y conocé su ritmo.",
    tone: "celeste",
    ownerOnly: true,
  },
  {
    href: "/herramientas/contracciones",
    title: "Contracciones",
    desc: "Medí duración e intervalo cuando empiecen las contracciones.",
    tone: "arena",
    ownerOnly: true,
  },
  {
    href: "/herramientas/peso",
    title: "Peso",
    desc: "Seguí tu evolución con un gráfico simple.",
    tone: "salvia",
    ownerOnly: true,
  },
  {
    href: "/herramientas/fotos",
    title: "Diario de fotos",
    desc: "Seguí el crecimiento de tu panza. Las fotos no se suben nunca.",
    tone: "rosa",
    ownerOnly: true,
  },
  {
    href: "/herramientas/carne",
    title: "Carné perinatal",
    desc: "Llevá una copia en fotos de tu carné y tus datos clave, siempre con vos.",
    tone: "celeste",
    ownerOnly: true,
  },
  {
    href: "/herramientas/resumen",
    title: "Resumen para el control",
    desc: "Organizá tus datos en una hoja para mostrarle a tu médico/a.",
    tone: "salvia",
    ownerOnly: true,
  },
  {
    href: "/derechos",
    title: "Tus derechos",
    desc: "Licencia, subsidio de IPS, gratuidad y ayudas: qué te corresponde.",
    tone: "arena",
  },
  {
    href: "/guias",
    title: "Guías",
    desc: "Artículos sobre el embarazo, pensados para Paraguay.",
    tone: "lavanda",
  },
  {
    href: "/eventos",
    title: "Eventos",
    desc: "Charlas, talleres y encuentros para embarazadas y mamás.",
    tone: "celeste",
  },
];

export const TOOL_TONE_CLASS: Record<ToolTone, string> = {
  rosa: "bg-pastel-rosa",
  celeste: "bg-pastel-celeste",
  salvia: "bg-pastel-salvia",
  lavanda: "bg-pastel-lavanda",
  arena: "bg-pastel-arena",
};

/**
 * The tools a given role should see. A partner or a family member has no
 * belly photos and no carné of their own; showing them tools that record the
 * mother's data would be both confusing and wrong (BUILD-PLAN C4).
 */
export function toolsForRole(isOwner: boolean): Tool[] {
  return isOwner ? TOOLS : TOOLS.filter((t) => !t.ownerOnly);
}
