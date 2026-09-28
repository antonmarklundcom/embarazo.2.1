"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, notDeleted } from "../db";
import { useFlag } from "../flags/useFlag";
import {
  asLocale,
  DEFAULT_LOCALE,
  translate,
  type CoreKey,
  type Locale,
} from "./dict";

/**
 * K19-L1 — the locale this device is reading in.
 *
 * Read straight off the Dexie profile row rather than from a React context.
 * The reason is the toggle: `useLiveQuery` re-runs every subscribed component
 * when the row changes, so switching the language in Ajustes repaints the nav
 * bar behind it with no provider, no event bus, and no reload. A context would
 * need something to push the change into it, and that something would be a
 * second source of truth for a value the database already holds.
 *
 * The profile row syncs (it is in `lib/sync/stores.ts`), so the choice follows
 * the woman to her second device for free — no new field on the wire, no new
 * server column. It also costs nothing in privacy: the payload was already
 * opaque to the server, and a locale is not a health fact.
 *
 * Before the first IndexedDB read resolves, and during SSR, this is `es` —
 * the default, not a guess. A flash of Spanish is the correct failure mode for
 * a Guaraní reader; a flash of `undefined` is not.
 */
export function useLocale(): Locale {
  const guarani = useGuarani();
  const locale = useLiveQuery(async () => {
    const rows = notDeleted(await db().profile.toArray());
    return asLocale(rows[0]?.locale);
  }, []);
  // Growth plan item 20b: with the `guarani` flag off the app reads in
  // Spanish whatever the row says. The stored choice is left alone, so it
  // comes back the day the flag is turned on.
  if (!guarani) return DEFAULT_LOCALE;
  return locale ?? DEFAULT_LOCALE;
}

/**
 * Growth plan item 20b — whether any Guaraní is shown on this device: the
 * Ajustes toggle and the `lang="gn"` lines under the Spanish. One flag
 * (`guarani`, /admin/flags), off until the native review of
 * docs/GUARANI-REVIEW.md. Off while the flag is unknown (first load offline).
 */
export function useGuarani(): boolean {
  return useFlag("guarani");
}

/**
 * The lookup function for the current locale.
 *
 * Returns a plain function rather than a component so a translated string can
 * go into an `aria-label`, a `placeholder` or a `title` — the attributes where
 * a missing translation is invisible in review and very visible to a screen
 * reader.
 */
export function useT(): (key: CoreKey) => string {
  const locale = useLocale();
  return (key: CoreKey) => translate(locale, key);
}

/**
 * Persist a new locale on the profile row.
 *
 * A no-op when there is no profile row yet: locale is a preference on an
 * existing profile, and onboarding creates the row within seconds of first
 * launch. Creating a row here to hold one preference would produce a profile
 * that onboarding then has to reconcile with.
 */
export async function setLocale(next: Locale): Promise<void> {
  const rows = await db().profile.toArray();
  const first = rows[0];
  if (!first?.id) return;
  await db().profile.update(first.id, { locale: next });
}
