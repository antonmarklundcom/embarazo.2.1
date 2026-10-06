import type { OnboardingAnswers } from "./progress";

// SITE-PLAN-EMBARAZO-COM-PY.md §5.3 — the marketing site's deep-link
// hand-off. A CTA on embarazo.com.py links to the app with plain query
// params (no SDK, no shared code): `?w=20` from a week page, `?fpp=` or
// `?fum=` from the due-date calculator, `?modo=planeando` from the
// planning cluster. This module is the pure parsing half — it only reads
// `location.search` and returns a patch for `OnboardingAnswers`; nothing
// here touches storage or the DOM (that's the caller's job, per §5.3:
// "read once, then dropped from the URL before any storage write").
//
// Deliberately narrow: this prefills field *values* on whichever step the
// user reaches (the date step "asks her to confirm or correct", per the
// plan) rather than skipping steps — nobody's flow is short-circuited by a
// URL they didn't necessarily construct themselves.
//
// F12 (2026-10 review): the calculator now hands its date over in the URL
// FRAGMENT (`#fum=` or `#fpp=`), which the browser never sends to a server, so
// a due date no longer lands in request URLs and access logs. The key also
// says which date she typed: the site used to turn every FUM into `?fpp=`,
// and the app labelled it an ultrasound date. Query links keep working for
// as long as old pages and shares are around; a fragment, when present, wins.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Every key the site may hand over, in the query or the fragment. */
export const SITE_PARAM_NAMES = ["w", "fpp", "fum", "modo"] as const;
const DATE_PARAM_NAMES = ["w", "fpp", "fum"] as const;

/**
 * A real calendar day. F12: `new Date("2026-02-30")` quietly becomes 2 March,
 * so the old check accepted it; the site's own check round-trips, and so does
 * this one now. Civil-date arithmetic in UTC, so no time zone can move it.
 */
export function isValidIsoDate(raw: string): boolean {
  if (!ISO_DATE.test(raw)) return false;
  const [year, month, day] = raw.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function paramsOf(raw: string): URLSearchParams {
  try {
    return new URLSearchParams(raw.replace(/^[?#]/, ""));
  } catch {
    return new URLSearchParams();
  }
}

/**
 * Today's date, `daysAgo` days earlier, as `YYYY-MM-DD` — in the device's
 * own calendar. `toISOString()` is UTC: in Paraguay (UTC-3) after 21:00 it
 * is already tomorrow there, so `?w=20` prefilled a date one day late and she
 * saw "Semana 19". Stepping with `setDate` also keeps a DST change inside the
 * span from shifting the day.
 */
function isoDateDaysAgo(daysAgo: number, now: number): string {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Parse the site's deep-link params out of a landing URL's query string and
 * fragment. Returns a patch to merge into onboarding answers, or `null` when
 * the URL carries none of them (the common case — most visits are not from
 * the site).
 */
export function siteParamsToAnswers(
  search: string,
  now: number = Date.now(),
  hash: string = "",
): Partial<OnboardingAnswers> | null {
  const query = paramsOf(search);
  const fragment = paramsOf(hash);
  // The date comes from one place, never half from each: a fragment that
  // names any date key is the whole answer.
  const dates = DATE_PARAM_NAMES.some((name) => fragment.has(name)) ? fragment : query;

  const patch: Partial<OnboardingAnswers> = {};

  if ((fragment.get("modo") ?? query.get("modo")) === "planeando") {
    patch.mode = "planeando";
  }

  // `fpp`/`fum` (the calculator) win over `w` (a week page) when both are
  // somehow present — an exact date beats a week estimate.
  const fpp = dates.get("fpp");
  const fum = dates.get("fum");
  const w = dates.get("w");

  if (fpp && isValidIsoDate(fpp)) {
    patch.method = "ecografia";
    patch.dueDateInput = fpp;
  } else if (fum && isValidIsoDate(fum)) {
    patch.method = "lmp";
    patch.lmp = fum;
  } else if (w) {
    const week = Number(w);
    if (Number.isInteger(week) && week >= 1 && week <= 42) {
      // Week 1 begins at the LMP (lib/pregnancy.ts `getCurrentWeek`), so an
      // estimated LMP for "currently in week N" is N-1 completed weeks ago.
      patch.method = "lmp";
      patch.lmp = isoDateDaysAgo((week - 1) * 7, now);
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * The same URL without any site param, or `null` when there was nothing to
 * remove. A fragment that is not ours (`#seccion`) is left exactly as it was.
 */
export function withoutSiteParams(href: string): string | null {
  const url = new URL(href);
  let changed = false;
  for (const name of SITE_PARAM_NAMES) {
    if (url.searchParams.has(name)) {
      url.searchParams.delete(name);
      changed = true;
    }
  }
  const fragment = paramsOf(url.hash);
  if (SITE_PARAM_NAMES.some((name) => fragment.has(name))) {
    for (const name of SITE_PARAM_NAMES) fragment.delete(name);
    const rest = fragment.toString();
    url.hash = rest ? `#${rest}` : "";
    changed = true;
  }
  return changed ? url.pathname + url.search + url.hash : null;
}
