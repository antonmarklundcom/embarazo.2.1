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
  familiar: "Familiar o amiga",
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
    title: "Familiar o amiga",
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
