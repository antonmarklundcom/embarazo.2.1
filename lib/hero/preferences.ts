"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { db, notDeleted } from "../db";
import { DEFAULT_THEME, asThemeId, type ThemeId } from "./themes";

// U7 — the two hero preferences, read the way K19 reads the locale.
//
// Straight off the Dexie profile row rather than from a React context, and for
// the same reason the language toggle does it: `useLiveQuery` re-runs every
// subscribed component when the row changes, so choosing a theme in the sheet
// repaints the hero behind it with no provider, no event bus and no reload. A
// context would need something to push the change into it, and that something
// would be a second source of truth for a value the database already holds.
//
// Before the first IndexedDB read resolves, and during SSR, these are the
// DEFAULTS rather than `undefined`. That is what stops the hero flashing an
// empty card on every load: a woman who chose `estrellas` sees one frame of
// `halo`, which is a theme; a `undefined` would be a blank rectangle where her
// baby should be.

/** The theme this device is showing. `halo` until the row says otherwise. */
export function useHeroTheme(): ThemeId {
  const theme = useLiveQuery(async () => {
    const rows = notDeleted(await db().profile.toArray());
    return asThemeId(rows[0]?.heroTheme);
  }, []);
  return theme ?? DEFAULT_THEME;
}

/**
 * Whether the fruit comparison is drawn.
 *
 * Defaults to TRUE — showing it — because it is the feature, not an extra.
 * The toggle exists for the woman who finds "tu bebé es del tamaño de una
 * sandía" unhelpful or unwelcome, and hiding it is her decision to make; the
 * app does not make it for her by default.
 */
export function useShowComparison(): boolean {
  const shown = useLiveQuery(async () => {
    const rows = notDeleted(await db().profile.toArray());
    const value = rows[0]?.showComparison;
    return typeof value === "boolean" ? value : true;
  }, []);
  return shown ?? true;
}

/**
 * Persist a theme.
 *
 * A no-op when there is no profile row, exactly like `setLocale`: this is a
 * preference on an existing profile, and onboarding creates the row within
 * seconds of first launch. Creating one here to hold a background choice would
 * produce a profile that onboarding then has to reconcile with.
 */
export async function setHeroTheme(next: ThemeId): Promise<void> {
  const rows = await db().profile.toArray();
  const first = rows[0];
  if (!first?.id) return;
  await db().profile.update(first.id, { heroTheme: next });
}

export async function setShowComparison(next: boolean): Promise<void> {
  const rows = await db().profile.toArray();
  const first = rows[0];
  if (!first?.id) return;
  await db().profile.update(first.id, { showComparison: next });
}
