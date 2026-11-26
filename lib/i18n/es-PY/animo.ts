// Screen text for the small suggestion under the mood check-in on Hoy
// (components/MoodCheckIn.tsx, lib/moodSuggestion.ts). One neutral line per
// destination: an offer, never advice, never a reading of her mood.
// docs/CONTENT-COUNTRY-RULE.md §3.

export const ANIMO_SUGGESTION_COPY = {
  /** /herramientas/diario */
  diario: "¿Querés anotarlo en tu diario?",
  /** /herramientas/fotos */
  fotos: "¿Querés guardar una foto de hoy?",
} as const;
