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
  /** Whether a fresh opt-in from Ajustes starts with this category on. */
  defaultOn: boolean;
  /**
   * Whether the settings screen shows a toggle for it. False only for a
   * category that has no sender yet: a switch with nothing behind it is worse
   * than no switch (the lesson of PR-5b). The category stays in the contract
   * and a stored opt-in is kept untouched; only the toggle is hidden.
   */
  offered: boolean;
}

/**
 * The categories, in the order they are shown.
 *
 * A category is on by default only when missing it costs the user something.
 * `recordatorios` is a prenatal control; `mimos` is a message a person
 * deliberately sent her. Those two are what "Activar avisos" in Ajustes turns
 * on, because there nobody has asked her about anything else.
 *
 * `consejos` ("Tu semana nueva") stays `defaultOn: false`, but it is no longer
 * simply "off until she finds it": the last onboarding step asks exactly
 * "¿Te aviso cuando empieza tu semana nueva?", and there it is PRE-SELECTED
 * (`ONBOARDING_CATEGORIES`) next to the two defaults, visibly, as a checkbox
 * she can untick before she taps "Sí". A weekly poke she was shown and kept is
 * one she asked for; one switched on behind a generic "Activar avisos" is the
 * kind that gets all notifications turned off for good. So the rule is: the
 * question that names the weekly notice pre-selects it, the generic switch
 * does not. Either way the browser permission is requested only by her tap on
 * "Sí" / "Activar avisos", never on load.
 *
 * `avisos` is a broadcast category with no sender anywhere in the codebase,
 * so it is not `offered`: its toggle is hidden until something sends it.
 */
export const PUSH_CATEGORY_INFO: readonly PushCategoryInfo[] = [
  {
    key: "recordatorios",
    label: "Recordatorios de control",
    description:
      "Un aviso el día antes de tu control prenatal, con la hora que anotaste.",
    defaultOn: true,
    offered: true,
  },
  {
    key: "consejos",
    label: "Tu semana nueva",
    description:
      "Un aviso el día que empieza cada semana de tu embarazo. Cuando nace tu bebé, uno por cada semana y cada mes de su primer año.",
    defaultOn: false,
    offered: true,
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
    offered: true,
  },
  {
    key: "avisos",
    label: "Avisos de Mi Bebé",
    description:
      "Cosas importantes de la app. Casi nunca: no mandamos publicidad.",
    defaultOn: false,
    // I5 called this a broadcast, and no code anywhere sends one (no
    // `scheduleReminders(…, "avisos", …)`, no insert with that category). Hidden
    // until a sender exists; kept in PUSH_CATEGORIES (and the MySQL enum) so a
    // stored opt-in survives and a future sender needs no migration.
    offered: false,
  },
];

export const DEFAULT_CATEGORIES: PushCategory[] = PUSH_CATEGORY_INFO.filter(
  (c) => c.defaultOn,
).map((c) => c.key);

/** The categories Ajustes shows a toggle for, in display order. */
export const OFFERED_CATEGORY_INFO: readonly PushCategoryInfo[] =
  PUSH_CATEGORY_INFO.filter((c) => c.offered);

/**
 * What the onboarding Avisos step starts with ticked: the Ajustes defaults
 * plus `consejos`, which is the notice that step's question names.
 */
export const ONBOARDING_CATEGORIES: PushCategory[] = PUSH_CATEGORY_INFO.filter(
  (c) => c.offered && (c.defaultOn || c.key === "consejos"),
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
