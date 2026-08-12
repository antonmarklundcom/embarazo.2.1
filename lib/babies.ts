import type { BabyIdentity } from "./db";

// B2 (feature map #2/#3): baby nickname threaded through copy wherever "tu
// bebé" is generic, and a twins-ready data model. This module is the single
// place that reads a `BabyIdentity[]` and produces copy, so screens don't
// each re-derive "first baby's name, or a fallback" independently.

/** The primary (first) baby's nickname, if one was given. */
export function primaryBabyName(babies: BabyIdentity[] | undefined): string | undefined {
  const name = babies?.[0]?.name?.trim();
  return name ? name : undefined;
}

export function isTwinsOrMore(babies: BabyIdentity[] | undefined): boolean {
  return (babies?.length ?? 0) >= 2;
}

/**
 * "Silvia a las 24 semanas" when a nickname is known, "Tu bebé a las 24
 * semanas" otherwise. Twins with no individual names fall back to the same
 * generic phrasing rather than guessing an order ("Bebé 1").
 */
export function babyAtWeekLabel(babies: BabyIdentity[] | undefined, week: number): string {
  const name = primaryBabyName(babies);
  return `${name ?? "Tu bebé"} a las ${week} semanas`;
}

/** Comma-joined nicknames for twins+ ("Silvia y Mateo"), or the single name. */
export function babyNamesList(babies: BabyIdentity[] | undefined): string | undefined {
  const names = (babies ?? [])
    .map((b) => b.name?.trim())
    .filter((n): n is string => !!n);
  if (names.length === 0) return undefined;
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}
