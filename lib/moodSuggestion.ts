import type { Mood } from "./db";
import { ANIMO_SUGGESTION_COPY } from "./i18n/es-PY/animo";
import { moodNeedsSupport } from "./mood";

// The mood check-in gives something back: after she records a face, one small
// link under the row to ONE existing screen. Pure, so the mapping is tested
// without a browser (lib/moodSuggestion.test.ts).
//
// The choices, and why:
//   * "Mal" / "Muy mal": nothing. The support card (Línea 155, "Ayuda y
//     emergencia") is what she sees, alone; a second link next to it would
//     compete with the one that matters.
//   * "Regular": the diary. `lib/mood.ts` calls "Regular" an ordinary day, and
//     linking it to the sleep log would read as a guess at why her day was so-so.
//     "Para conversar" does not exist on this branch.
//   * "Bien": the diary.
//   * "Muy bien": the photo diary during the pregnancy ("Diario de tu panza");
//     after the birth, the diary, because that screen is about the bump.
//
// Every destination is a live, ungated tool listed on /herramientas: none of
// them reads a `PUBLISHED_*` gate, so none can disappear under the link.

export interface MoodSuggestion {
  href: "/herramientas/diario" | "/herramientas/fotos";
  text: string;
}

const DIARIO: MoodSuggestion = { href: "/herramientas/diario", text: ANIMO_SUGGESTION_COPY.diario };
const FOTOS: MoodSuggestion = { href: "/herramientas/fotos", text: ANIMO_SUGGESTION_COPY.fotos };

/** The one suggestion for today's saved mood, or `null` for none. */
export function moodSuggestion(
  mood: Mood | undefined,
  options: { afterBirth?: boolean } = {},
): MoodSuggestion | null {
  if (mood === undefined || moodNeedsSupport(mood)) return null;
  if (mood === "muy_bien") return options.afterBirth ? DIARIO : FOTOS;
  return DIARIO;
}
