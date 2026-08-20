import type { Mood } from "./db";

// K9-F6 — the mood scale, in one place.
//
// It lived inline in `/herramientas/sintomas` while the home screen drew four
// anonymous faces that recorded nothing and only navigated there. F6 makes the
// home faces *record*, which means the two surfaces now have to agree on what
// each face means — and four faces for five moods was fine while a tap led to
// a labelled screen and is a bug the moment a tap is an answer.
//
// Order is worst-to-best nowhere and best-to-worst here: the row reads left to
// right from "muy bien" the way the sintomas screen already listed it, so a
// woman who has used one surface finds the same face in the same place on the
// other.

export interface MoodOption {
  key: Mood;
  label: string;
  emoji: string;
  /**
   * The mouth of the drawn face, as an SVG path over a 24×24 circle.
   *
   * Here rather than in the component because it is part of what the option
   * *means*: the face and the label have to say the same thing, and keeping
   * them in one record is what stops "regular" acquiring a smile in a refactor.
   */
  mouth: string;
  /** Tailwind background for the home screen's tile. */
  tone: string;
}

export const MOODS: readonly MoodOption[] = [
  {
    key: "muy_bien",
    label: "Muy bien",
    emoji: "😄",
    mouth: "M8 14.5c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4",
    tone: "bg-pastel-salvia",
  },
  {
    key: "bien",
    label: "Bien",
    emoji: "🙂",
    mouth: "M8.5 15.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5",
    tone: "bg-pastel-rosa",
  },
  {
    key: "regular",
    label: "Regular",
    emoji: "😐",
    mouth: "M9 15.5h6",
    tone: "bg-pastel-arena",
  },
  {
    key: "mal",
    label: "Mal",
    emoji: "🙁",
    mouth: "M8.5 16.5c1-1 2.2-1.5 3.5-1.5s2.5.5 3.5 1.5",
    tone: "bg-pastel-celeste",
  },
  {
    key: "muy_mal",
    label: "Muy mal",
    emoji: "😣",
    mouth: "M8 17c1-1.6 2.4-2.4 4-2.4s3 .8 4 2.4",
    tone: "bg-pastel-lavanda",
  },
];

export function moodOption(key: Mood | undefined): MoodOption | undefined {
  return MOODS.find((m) => m.key === key);
}

export function moodLabel(key?: Mood): string {
  return moodOption(key)?.label ?? "—";
}

export function moodEmoji(key?: Mood): string {
  return moodOption(key)?.emoji ?? "•";
}
