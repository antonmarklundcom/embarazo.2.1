// Hoy's daily stories (Flo benchmark, 2026-10-17): the week, told as a short
// row of full-screen cards she can tap through: bebé, vos, para hacer, pareja,
// familia, preguntas, ejercicio, síntomas.
//
// Built only from content that is already reviewed and shipped: the week entry
// (`lib/weeks.ts`), the perspective bands (`lib/seed/perspectives.json`), the
// control questions (`lib/controlPrep.ts`) and the published exercises
// (`lib/seed/ejercicios.json`). Nothing here is new medical text; the only new
// words are labels and the links' calls to action. A story with nothing to say
// for a week is left out rather than shown empty.

import type { Role } from "@/lib/db";
import { questionsForWeek } from "@/lib/controlPrep";
import { getTrimester } from "@/lib/pregnancy";
import { hasWeekArt, weekArtAlt, weekArtSrc } from "@/lib/hero/weekArt";
import { PUBLISHED_EJERCICIOS } from "@/lib/seed/ejercicios";
import { perspectivesFor } from "@/lib/seed/perspectives";
import { getWeek, sizeLine } from "@/lib/weeks";
import type { ToolIconName } from "@/components/ToolIcon";

export type StoryId =
  | "bebe"
  | "vos"
  | "hacer"
  | "pareja"
  | "familia"
  | "ella"
  | "preguntas"
  | "ejercicio"
  | "sintomas";

export interface Story {
  id: StoryId;
  /** The short label under the circle. */
  label: string;
  /** The heading inside the viewer. */
  title: string;
  /** Paragraphs, in order. */
  body: string[];
  /** Optional bullet list under the paragraphs. */
  list?: string[];
  /** Canonical image path (RealisticPicture resolves the optimized files). */
  image?: { src: string; alt: string };
  /** Icon shown in the circle when there is no image. Decorative. */
  icon: ToolIconName;
  cta?: { href: string; label: string };
}

/** Which perspective is "hers" for this role: the one shown as "vos". */
function ownPerspective(role: Role): "vos" | "pareja" | "familia" {
  if (role === "papa" || role === "acompanante") return "pareja";
  if (role === "familiar") return "familia";
  return "vos";
}

/** The exercise for this week: the trimester's list, rotating by week. */
function exerciseFor(week: number) {
  const trimester = getTrimester(week);
  const options = PUBLISHED_EJERCICIOS.filter((e) => e.trimesters.includes(trimester));
  if (options.length === 0) return null;
  return options[week % options.length];
}

export function storiesForWeek(week: number, role: Role = "mama"): Story[] {
  const info = getWeek(week);
  const bands = perspectivesFor(week);
  const own = ownPerspective(role);
  const stories: Story[] = [];

  const size = sizeLine(info.sizeComparison);
  stories.push({
    id: "bebe",
    label: "Bebé",
    title: `Semana ${week}: tu bebé`,
    body: [info.milestone, ...(size ? [size] : [])],
    image: hasWeekArt(week) ? { src: weekArtSrc(week), alt: weekArtAlt(week) ?? `Tu bebé en la semana ${week}` } : undefined,
    icon: "feet",
    cta: { href: `/semana/${week}`, label: "Ver la semana completa" },
  });

  if (bands) {
    // Her own perspective first, as "Vos"; the other two keep their names.
    const order: ("vos" | "pareja" | "familia")[] = [own, ...(["vos", "pareja", "familia"] as const).filter((k) => k !== own)];
    const titles = { vos: "Para vos", pareja: "Para tu pareja", familia: "Para la familia" } as const;
    const labels = { vos: "Vos", pareja: "Pareja", familia: "Familia" } as const;
    const icons: Record<"vos" | "pareja" | "familia", ToolIconName> = { vos: "diary", pareja: "guides", familia: "guides" };
    order.forEach((key, index) => {
      const text = bands[key];
      if (!text) return;
      // A partner or relative reads the mother's band as "Para ella".
      const id: StoryId = index === 0 ? "vos" : key === "vos" ? "ella" : key;
      const label = index === 0 ? "Vos" : key === "vos" ? "Ella" : labels[key];
      const title = index === 0 ? "Para vos" : key === "vos" ? "Para ella" : titles[key];
      stories.push({ id, label, title, body: [text], icon: icons[key] });
      if (index === 0 && info.tip) {
        stories.push({
          id: "hacer",
          label: "Para hacer",
          title: "Para hacer esta semana",
          body: [info.tip],
          icon: "checklist",
          cta: { href: "/herramientas/checklist", label: "Abrir mis listas" },
        });
      }
    });
  } else if (info.tip) {
    stories.push({ id: "hacer", label: "Para hacer", title: "Para hacer esta semana", body: [info.tip], icon: "checklist", cta: { href: "/herramientas/checklist", label: "Abrir mis listas" } });
  }

  const questions = questionsForWeek(week).slice(0, 3).map((q) => q.text);
  if (questions.length > 0) {
    stories.push({
      id: "preguntas",
      label: "Preguntas",
      title: "Para preguntar en tu control",
      body: ["Algunas preguntas que suelen servir en esta etapa:"],
      list: questions,
      icon: "faq",
      cta: { href: "/herramientas/resumen", label: "Preparar mi control" },
    });
  }

  const exercise = exerciseFor(week);
  if (exercise) {
    const image = exercise.steps.find((s) => s.imageSrc)?.imageSrc;
    stories.push({
      id: "ejercicio",
      label: "Ejercicio",
      title: `${exercise.title} · ${exercise.durationMin} min`,
      body: [exercise.benefits[0], exercise.steps[0]?.text].filter((text): text is string => Boolean(text)),
      image: image ? { src: image, alt: exercise.title } : undefined,
      icon: "exercise",
      cta: { href: `/herramientas/ejercicios/${exercise.id}`, label: "Ver el ejercicio" },
    });
  }

  stories.push({
    id: "sintomas",
    label: "Síntomas",
    title: "¿Cómo te sentís hoy?",
    body: ["Anotar lo que sentís te ayuda a ver cómo cambia y a contárselo a tu médico en el próximo control."],
    icon: "symptoms",
    cta: { href: "/herramientas/sintomas", label: "Registrar síntomas" },
  });

  return stories;
}
