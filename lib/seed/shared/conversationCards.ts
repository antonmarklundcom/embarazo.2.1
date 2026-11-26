import {
  CONVERSATION_THEMES,
  ConversationCardSchema,
  validateContentArray,
  type ConversationCard,
  type ConversationTheme,
} from "../../content/schemas";
import { publishedOnly } from "../gate";
import rawFile from "./conversationCards.json";

// "Para conversar": question cards for her and whoever accompanies her (a
// pareja, her mother, a sister, a friend), to talk before the baby arrives.
//
// Same pattern as lib/seed/py/familyLines.ts: validated at import and again in
// `npm run validate:content`, passed through `publishedOnly()`. It lives in
// lib/seed/shared/ because none of the questions depends on the country: no
// law, no institution, no amount, nothing medical (the guard test enforces it).

const file = rawFile as { lang: string; items: unknown[] };
const { valid, errors } = validateContentArray(
  "lib/seed/shared/conversationCards.json",
  file.items,
  ConversationCardSchema,
);
if (errors.length > 0) {
  throw new Error(
    `Contenido inválido en lib/seed/shared/conversationCards.json:\n${errors.join("\n")}`,
  );
}

export const CONVERSATION_CARDS_LANG = file.lang;

export const PUBLISHED_CONVERSATION_CARDS: ConversationCard[] = publishedOnly(valid);

/** The themes that have at least one published card, in screen order. */
export const CONVERSATION_THEMES_IN_USE: ConversationTheme[] = CONVERSATION_THEMES.filter(
  (theme) => PUBLISHED_CONVERSATION_CARDS.some((card) => card.theme === theme),
);

/** The cards for one theme, or all of them when `theme` is null. */
export function conversationCards(theme: ConversationTheme | null): ConversationCard[] {
  if (theme === null) return PUBLISHED_CONVERSATION_CARDS;
  return PUBLISHED_CONVERSATION_CARDS.filter((card) => card.theme === theme);
}
