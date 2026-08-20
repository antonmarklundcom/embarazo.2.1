// BUILD-PLAN K2 — "mandale ánimo" (docs/FABLE-PLAN-2026-08.md §3).
//
// A companion taps one of these and the mamá sees it on her home screen. The
// entire message is **an id from this list**: the wire carries `"fuerza"`, the
// database stores `"fuerza"`, and the words are rendered from this file on the
// reading device.
//
// That is the design, not an optimisation. A free-text channel from a partner
// or a family member into a pregnant user's home screen is a moderation
// surface, an abuse surface and a support surface, and this app has none of the
// three and should not acquire them to say "¡fuerza!". It is also why nothing
// here needs to be stored as prose on the server: an id is not health data and
// not user content, so `companionCheers` stays legible in a way
// `syncRecords.payload` deliberately is not.
//
// Adding a phrase is an edit to this list in a reviewed diff. Removing one is
// handled at read time (`cheerById` returns null), so an id that used to exist
// degrades to nothing rather than crashing somebody's home screen.

import type { BilingualText } from "../content/schemas.ts";

export interface Cheer {
  id: string;
  emoji: string;
  /**
   * What the mamá reads, es-PY voseo, with an optional Guaraní companion —
   * K19-L0's `{ es, gn? }` shape, the same one the alarm signs use.
   *
   * `gn` is present only where the phrase is one people actually say in
   * Guaraní. Not every entry has one, and inventing one for the sake of
   * symmetry would be worse than leaving it out — these are terms of
   * affection, and a wrong one lands badly.
   */
  text: BilingualText;
  /** How the *sender* sees the button. */
  buttonLabel: string;
}

export const CHEERS = [
  {
    id: "fuerza",
    emoji: "💪",
    text: { es: "¡Fuerza! Estoy con vos.", gn: "Py'aguasu! Aime nendive." },
    buttonLabel: "¡Fuerza!",
  },
  {
    id: "te-quiero",
    emoji: "❤️",
    text: { es: "Te quiero.", gn: "Rohayhu." },
    buttonLabel: "Te quiero",
  },
  {
    id: "gracias",
    emoji: "🙏",
    text: { es: "Gracias por todo lo que estás haciendo.", gn: "Aguyje." },
    buttonLabel: "Gracias",
  },
  {
    id: "pensando",
    emoji: "🌼",
    text: { es: "Estoy pensando en vos y en el bebé." },
    buttonLabel: "Pensando en vos",
  },
  {
    id: "orgullo",
    emoji: "✨",
    text: { es: "Estoy orgullosa/o de vos." },
    buttonLabel: "Orgullo",
  },
] as const satisfies readonly Cheer[];

export type CheerId = (typeof CHEERS)[number]["id"];

export const CHEER_IDS = CHEERS.map((cheer) => cheer.id) as readonly CheerId[];

export function isCheerId(value: unknown): value is CheerId {
  return (
    typeof value === "string" && (CHEER_IDS as readonly string[]).includes(value)
  );
}

/**
 * The cheer for an id, or null.
 *
 * Null rather than a fallback phrase: a retired id should render nothing at
 * all, not a generic "alguien te mandó ánimo" that the sender never wrote.
 */
export function cheerById(id: string): Cheer | null {
  return CHEERS.find((cheer) => cheer.id === id) ?? null;
}

/**
 * How many cheers of one kind, most recent first, collapse into one line.
 *
 * Twelve separate "❤️ Te quiero" cards is a notification feed; one card saying
 * "❤️ Te quiero · 12" is a nice thing that happened. Pure so the grouping is
 * testable without a database.
 */
export interface CheerReceipt {
  cheerId: string;
  createdAt: number;
}

export interface GroupedCheer {
  cheer: Cheer;
  count: number;
  latestAt: number;
}

export function groupCheers(receipts: readonly CheerReceipt[]): GroupedCheer[] {
  const byId = new Map<string, GroupedCheer>();
  for (const receipt of receipts) {
    const cheer = cheerById(receipt.cheerId);
    // A retired id contributes nothing — not a count, not a card.
    if (!cheer) continue;
    const existing = byId.get(cheer.id);
    if (existing) {
      existing.count += 1;
      existing.latestAt = Math.max(existing.latestAt, receipt.createdAt);
    } else {
      byId.set(cheer.id, { cheer, count: 1, latestAt: receipt.createdAt });
    }
  }
  return [...byId.values()].sort((a, b) => b.latestAt - a.latestAt);
}
