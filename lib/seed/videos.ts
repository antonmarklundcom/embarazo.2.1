import type { VideoItem } from "../types";

// Curated educational video gallery (build spec §4).
//
// PLACEHOLDER SEED DATA — replace before launch.
// The `youtubeId` values below are PLACEHOLDERS using well-known public videos
// (e.g. official channels / a famous public sample). Swap them for real,
// curated, es-PY pregnancy/health videos with permission to feature them.
// Videos are embedded via youtube-nocookie.com (privacy-enhanced mode); nothing
// is self-hosted and there is no backend.
//
// To edit: add/remove entries here. `topic` drives the topic filter and
// `trimester` (0 = general/todos) drives the trimester filter.
export const VIDEOS: VideoItem[] = [
  {
    id: "vid-alimentacion",
    title: "Alimentación saludable en el embarazo",
    description:
      "Qué priorizar en el plato durante el embarazo, con ideas simples y accesibles.",
    topic: "Nutrición",
    trimester: 0,
    youtubeId: "dQw4w9WgXcQ", // PLACEHOLDER — replace with a real video ID
    durationLabel: "5 min",
  },
  {
    id: "vid-primer-trimestre",
    title: "Qué esperar en el primer trimestre",
    description:
      "Cambios del cuerpo, primeros controles y síntomas frecuentes de las primeras semanas.",
    topic: "Etapas",
    trimester: 1,
    youtubeId: "dQw4w9WgXcQ", // PLACEHOLDER — replace with a real video ID
    durationLabel: "7 min",
  },
  {
    id: "vid-ejercicios",
    title: "Ejercicios y movimiento seguro",
    description:
      "Actividad física suave y segura para acompañar el segundo trimestre.",
    topic: "Bienestar",
    trimester: 2,
    youtubeId: "dQw4w9WgXcQ", // PLACEHOLDER — replace with a real video ID
    durationLabel: "8 min",
  },
  {
    id: "vid-señales-parto",
    title: "Señales de que se acerca el parto",
    description:
      "Cómo reconocer las contracciones de trabajo de parto y cuándo ir al sanatorio.",
    topic: "Parto",
    trimester: 3,
    youtubeId: "dQw4w9WgXcQ", // PLACEHOLDER — replace with a real video ID
    durationLabel: "6 min",
  },
  {
    id: "vid-lactancia",
    title: "Primeros días de lactancia",
    description:
      "Una introducción calmada a la lactancia y el agarre en los primeros días.",
    topic: "Lactancia",
    trimester: 0,
    youtubeId: "dQw4w9WgXcQ", // PLACEHOLDER — replace with a real video ID
    durationLabel: "9 min",
  },
  {
    id: "vid-bolso",
    title: "Preparar el bolso para el sanatorio",
    description:
      "Qué llevar para vos y para el bebé, pensado para el contexto local.",
    topic: "Parto",
    trimester: 3,
    youtubeId: "dQw4w9WgXcQ", // PLACEHOLDER — replace with a real video ID
    durationLabel: "4 min",
  },
];
