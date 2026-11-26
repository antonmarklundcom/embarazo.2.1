import type { Role } from "./db";

// B1 (feature map #1): the relationship role drives tone, not access. This
// module is the single place that maps a role to phrasing, so every screen
// pulls from the same vocabulary instead of hand-rolling "tu"/"su" branches.

/** Canonical display order for role pickers (onboarding, Ajustes). */
export const ROLE_ORDER: Role[] = ["mama", "papa", "acompanante", "familiar"];

export const ROLE_LABELS: Record<Role, string> = {
  mama: "Mamá",
  papa: "Papá",
  acompanante: "Acompañante",
  familiar: "Familia o amistades",
};

export const ROLE_ONBOARDING_COPY: Record<Role, { title: string; desc: string }> = {
  mama: {
    title: "Mamá",
    desc: "Estoy embarazada o buscando estarlo.",
  },
  papa: {
    title: "Papá",
    desc: "Mi pareja está embarazada o buscando estarlo.",
  },
  acompanante: {
    title: "Acompañante",
    desc: "Acompaño a alguien en su embarazo o búsqueda.",
  },
  familiar: {
    title: "Familia o amistades",
    desc: "Quiero seguir de cerca el embarazo de alguien querido.",
  },
};

/** Whether the person using the app is themself pregnant/TTC ("mama"). */
export function isSelfCentered(role: Role | undefined): boolean {
  return (role ?? "mama") === "mama";
}

/**
 * Possessive pronoun for the pregnancy/baby ("tu" for mamá, "su" for
 * everyone accompanying someone else's pregnancy).
 */
export function pregnancyPossessive(role: Role | undefined): "tu" | "su" {
  return isSelfCentered(role) ? "tu" : "su";
}

/** "Tu embarazo" / "Su embarazo", capitalized for sentence-initial use. */
export function pregnancyPossessiveCap(role: Role | undefined): "Tu" | "Su" {
  return isSelfCentered(role) ? "Tu" : "Su";
}

/** Home hero caption: "Tu bebé a las 24 semanas" / "El bebé a las 24 semanas". */
export function babyAtWeekLabel(role: Role | undefined, week: number): string {
  const possessive = isSelfCentered(role) ? "Tu bebé" : "El bebé";
  return `${possessive} a las ${week} semanas`;
}

/** Daily mood check-in header, which only makes sense asked of the mamá herself. */
export function moodCheckInLabel(role: Role | undefined): string {
  return isSelfCentered(role)
    ? "¿Cómo te sentís hoy?"
    : "¿Cómo se siente hoy?";
}

/**
 * Prompts that ask the mamá to reach out to "her pareja".
 *
 * Not every woman using the app has one, and the people who accompany her are
 * often a sister, a mother or a friend. The profile stores no answer that says
 * whether she has a partner (onboarding asks primer embarazo, dónde te
 * atendés and trabajás, nothing more), so these prompts cannot be switched per
 * person; they are worded so they are true either way. One place, so a future
 * "¿tenés pareja?" answer only has to change this function.
 */
export type PartnerPromptKey =
  /** The WhatsApp link under the share card on Hoy. */
  | "shareCta"
  /** /familia page description. */
  | "familiaDescription"
  /** Familia settings, before she has an account. */
  | "familiaNeedsAccount";

const PARTNER_PROMPTS: Record<PartnerPromptKey, string> = {
  shareCta: "Contale a tu pareja o a quien te acompañe",
  familiaDescription:
    "Invitá a tu pareja o a quien te acompañe, y a tu familia, a seguir tu embarazo desde su teléfono, con lo que vos elijas compartir.",
  familiaNeedsAccount:
    "Con una cuenta podés invitar a tu pareja o a quien te acompañe, y a tu familia, a seguir tu embarazo, y sacarles el acceso cuando quieras.",
};

export function partnerPrompt(key: PartnerPromptKey): string {
  return PARTNER_PROMPTS[key];
}
