// Screen text for "Pregunta del día" on Hoy (components/home/DailyQuestionCard.tsx).
// The questions themselves are content, in lib/seed/py/dailyQuestions.json.
// docs/CONTENT-COUNTRY-RULE.md §3.

export const PREGUNTA_COPY = {
  /** Small heading above the question. */
  title: "Pregunta del día",
  /** Heading over the bars, shown once enough answers exist in her trimester. */
  resultsTitle: "Así respondieron otras mamás",
  /** Under the threshold (or offline): one line instead of the bars. */
  thanks: "Gracias. Cuando haya más respuestas vas a ver cómo respondieron otras mamás.",
  /** Screen-reader suffix on the option she chose. */
  yourAnswer: "tu respuesta",
  /** Accessible name of the group of answer buttons. */
  optionsLabel: "Respuestas",
} as const;
