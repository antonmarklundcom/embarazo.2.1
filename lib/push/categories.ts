// BUILD-PLAN B5 — the push category contract.
//
// Pure and dependency-free so both the service worker and the settings screen
// can import it, and so it is unit-testable without a database.
//
// FEATURE-MAP #7 asks for granular opt-ins. "Granular" here means each
// category is independently on or off, and turning one off must not turn
// another on or silently re-enable anything.

export const PUSH_CATEGORIES = [
  "consejos",
  "recordatorios",
  "avisos",
  "mimos",
] as const;
export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export interface PushCategoryInfo {
  key: PushCategory;
  label: string;
  description: string;
  /** Whether a fresh opt-in starts with this category on. */
  defaultOn: boolean;
}

/**
 * The categories, in the order they are shown.
 *
 * A category is on by default only when missing it costs the user something.
 * `recordatorios` is a prenatal control; `mimos` is a message a person
 * deliberately sent her. A weekly tip nobody asked for is the reason people
 * turn notifications off entirely and never come back, so `consejos` is off
 * until she says otherwise — and, since PR-5b, it finally does something when
 * she does (`lib/push/weekly.ts`).
 */
export const PUSH_CATEGORY_INFO: readonly PushCategoryInfo[] = [
  {
    key: "recordatorios",
    label: "Recordatorios de control",
    description:
      "Un aviso el día antes de tu control prenatal, con la hora que anotaste.",
    defaultOn: true,
  },
  {
    key: "consejos",
    label: "Consejos de la semana",
    description: "Un mensaje por semana con lo que está pasando en tu embarazo.",
    defaultOn: false,
  },
  {
    key: "mimos",
    label: "Mimos de tu familia",
    description:
      "Cuando tu pareja o tu familia te manda un mimo desde su celular.",
    // On by default, and the only category besides `recordatorios` that is.
    // The rule this list follows is "on by default only when missing it costs
    // her something", and a mimo is a message a person deliberately sent her —
    // the same standing a message from a human has in every other app. It also
    // cannot become noise: nobody but the people she invited can send one, and
    // they are rare by nature.
    defaultOn: true,
  },
  {
    key: "avisos",
    label: "Avisos de Mi Bebé",
    description:
      "Cosas importantes de la app. Casi nunca: no mandamos publicidad.",
    defaultOn: false,
  },
];

export const DEFAULT_CATEGORIES: PushCategory[] = PUSH_CATEGORY_INFO.filter(
  (c) => c.defaultOn,
).map((c) => c.key);

export function isPushCategory(value: string): value is PushCategory {
  return (PUSH_CATEGORIES as readonly string[]).includes(value);
}

/** Drop anything unrecognised and de-duplicate, preserving display order. */
export function normaliseCategories(values: readonly string[]): PushCategory[] {
  const wanted = new Set(values.filter(isPushCategory));
  return PUSH_CATEGORY_INFO.map((c) => c.key).filter((key) => wanted.has(key));
}

export function toggleCategory(
  current: readonly PushCategory[],
  category: PushCategory,
  on: boolean,
): PushCategory[] {
  const next = new Set(current);
  if (on) next.add(category);
  else next.delete(category);
  return normaliseCategories([...next]);
}

/**
 * True when the device should be poked for this category.
 *
 * Enforced on the server at send time, not only in the UI: a toggle that only
 * hides a notification the phone already received is not an opt-out.
 */
export function acceptsCategory(
  subscribed: readonly string[],
  category: PushCategory,
): boolean {
  return normaliseCategories(subscribed).includes(category);
}
