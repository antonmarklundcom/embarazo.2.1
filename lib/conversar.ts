import { PUBLISHED_CONVERSATION_CARDS } from "./seed/shared/conversationCards";

// "Para conversar": which cards she (or whoever holds the phone) marked as
// "Ya lo hablamos". Device only, like the picks in "Preparar mi control"
// (`lib/controlPrep.ts`): one localStorage key, never synced, never sent. It
// holds card ids and nothing anybody wrote.

export const CONVERSAR_STORAGE_KEY = "mibebe.conversar.talked";

/** Narrow whatever is stored to the ids of cards that still exist. */
export function parseTalked(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    const known = new Set(PUBLISHED_CONVERSATION_CARDS.map((card) => card.id));
    return [...new Set(value.filter((id): id is string => typeof id === "string" && known.has(id)))];
  } catch {
    return [];
  }
}

export function readTalked(): string[] {
  try {
    return parseTalked(window.localStorage.getItem(CONVERSAR_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function writeTalked(ids: readonly string[]): void {
  try {
    window.localStorage.setItem(CONVERSAR_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Private mode: the marks live for this visit only.
  }
}

/** The list with `id` added or removed. */
export function toggleTalked(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id];
}
