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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(raw: string): boolean {
  if (!ISO_DATE.test(raw)) return false;
  const ms = new Date(`${raw}T00:00:00`).getTime();
  return !Number.isNaN(ms);
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
 * Parse the site's deep-link params out of a landing URL's query string.
 * Returns a patch to merge into onboarding answers, or `null` when the URL
 * carries none of them (the common case — most visits are not from the
 * site).
 */
export function siteParamsToAnswers(
  search: string,
  now: number = Date.now(),
): Partial<OnboardingAnswers> | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }

  const patch: Partial<OnboardingAnswers> = {};

  if (params.get("modo") === "planeando") {
    patch.mode = "planeando";
  }

  // `fpp`/`fum` (the calculator) win over `w` (a week page) when both are
  // somehow present — an exact date beats a week estimate.
  const fpp = params.get("fpp");
  const fum = params.get("fum");
  const w = params.get("w");

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
