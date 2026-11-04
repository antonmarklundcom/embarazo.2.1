// Night run 2026-11-04, item 1 — where a shared link lands, and how the
// install it brings is counted.
//
// Every message the app composes for somebody else used to carry the bare
// `NEXT_PUBLIC_APP_URL`. For a stranger that is the sign-in wall: `/` is not a
// public route, so the first thing a forwarded link showed was a login. Now
// each kind of share points at a page that opens without an account and
// carries a `?src=` the funnel can count (`lib/stats/funnel.ts`):
//
//   * `semana` — a week's text from the week page, to `/semana/N`.
//   * `pareja` — the "Contale a tu pareja" text, to the same public week page.
//   * `invita` — "pasale la app a una amiga", to the welcome screen, and the
//     family invitation link, to the public `/cuenta/invitacion` landing.
//
// `?src=` is a fixed word per kind of share. Nothing of hers is in it: not the
// week she is in (the week in the *path* is the week whose text is being
// shared, which is the same text everybody in that week reads), not an id, not
// a date.

import { MAX_WEEK, MIN_WEEK } from "@/lib/pregnancy";

export const SHARE_SOURCES = ["semana", "pareja", "invita"] as const;
export type ShareSource = (typeof SHARE_SOURCES)[number];

export function isShareSource(value: string | null | undefined): value is ShareSource {
  return (SHARE_SOURCES as readonly string[]).includes(value ?? "");
}

/** The configured public origin without a trailing slash, or null if it is not an http(s) URL. */
export function appOrigin(appUrl: string | undefined): string | null {
  const base = appUrl?.trim();
  if (!base || !/^https?:\/\//.test(base)) return null;
  return base.replace(/\/+$/, "");
}

/**
 * `${origin}${path}?src=${source}` (or `&src=` when the path already carries a
 * query), or null when there is no public origin to link to.
 */
export function shareLink(
  appUrl: string | undefined,
  path: string,
  source: ShareSource,
): string | null {
  const origin = appOrigin(appUrl);
  if (!origin) return null;
  const joiner = path.includes("?") ? "&" : "?";
  return `${origin}${path}${joiner}src=${source}`;
}

/** The public week page, for a share of that week's text. */
export function weekShareLink(
  appUrl: string | undefined,
  week: number,
  source: Extract<ShareSource, "semana" | "pareja">,
): string | null {
  if (!Number.isInteger(week) || week < MIN_WEEK || week > MAX_WEEK) return null;
  return shareLink(appUrl, `/semana/${week}`, source);
}
