// Screen text for "Para conversar" (/herramientas/conversar), the question
// cards in lib/seed/shared/conversationCards.json. docs/CONTENT-COUNTRY-RULE.md §3.

import type { ConversationTheme } from "../../content/schemas";

export const CONVERSAR_COPY = {
  title: "Para conversar",
  subtitle:
    "Preguntas para charlar con tu pareja o con quien te acompaña, antes de que llegue el bebé.",
  /** Tile sentence in the tools grid (screen readers read it). */
  toolDesc: "Preguntas para charlar con tu pareja o con quien te acompaña, antes de que llegue el bebé.",
  filterLabel: "Temas",
  allThemes: "Todas",
  previous: "Anterior",
  next: "Siguiente",
  talked: "Ya lo hablamos",
  /** "12 de 36" */
  position: (index: number, total: number) => `${index} de ${total}`,
  /** "5 habladas" */
  talkedCount: (count: number) => `${count} ${count === 1 ? "hablada" : "habladas"}`,
  share: "Mandar por WhatsApp",
  privacy: "Lo que marcás se guarda en este teléfono y no se copia a tu cuenta.",
  /** The link card on /familia. */
  familyLinkTitle: "Para conversar",
  familyLinkBody:
    "Preguntas para charlar con quien te acompaña sobre cómo quieren recibir al bebé.",
} as const;

export const CONVERSAR_THEME_LABELS: Record<ConversationTheme, string> = {
  casa: "Los primeros días en casa",
  reparto: "Cómo nos repartimos",
  plata: "Plata y trabajo",
  visitas: "Familia y visitas",
  ilusiones: "Lo que nos ilusiona y lo que nos asusta",
  criar: "Cómo queremos criar",
};

/** Short names for the filter chips, so they fit in two rows at 360 px. */
export const CONVERSAR_THEME_CHIPS: Record<ConversationTheme, string> = {
  casa: "En casa",
  reparto: "Repartirnos",
  plata: "Plata y trabajo",
  visitas: "Visitas",
  ilusiones: "Ilusiones y miedos",
  criar: "Criar",
};
