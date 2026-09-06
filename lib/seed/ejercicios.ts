import { ExerciseSchema, validateContentArray, type Exercise } from "../content/schemas";
import { publishedOnly } from "./gate";
import rawEjercicios from "./ejercicios.json";

// D6 — "Ejercicios" (feature map #22): images + text, no video.
//
// Every entry ships today with every `imageSrc` pointing at the shared
// `placeholder.webp` — no real step photos exist yet. `publishedOnly()` (the
// same gate as the directory/events/videos, Z1) already treats any string
// containing "placeholder" as unpublished, so this reuses that mechanism
// rather than inventing a second one: an exercise lights up the moment its
// JSON entry is edited to point at real, committed files, no code change.
const { valid, errors } = validateContentArray(
  "lib/seed/ejercicios.json",
  rawEjercicios as unknown[],
  ExerciseSchema,
);
if (errors.length > 0) {
  throw new Error(`Contenido inválido en lib/seed/ejercicios.json:\n${errors.join("\n")}`);
}

export const EJERCICIOS: Exercise[] = valid;

export const PUBLISHED_EJERCICIOS: Exercise[] = publishedOnly(EJERCICIOS);

export function getEjercicioById(id: string): Exercise | undefined {
  return PUBLISHED_EJERCICIOS.find((exercise) => exercise.id === id);
}
