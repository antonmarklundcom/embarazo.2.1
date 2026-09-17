// U-account-nudge — a real, visible nudge toward creating an account, but only
// once a local-only user has data actually worth protecting.
//
// ARCHITECTURE.md §4.2 keeps "seguir sin cuenta" a first-class path: this
// module exists to make the *cost* of that path honest, not to push accounts
// as an upsell. It never gates on zero usage — a user who just finished
// onboarding has nothing to lose yet and should not be told otherwise.
//
// The trigger reuses `profile.createdAt`, a field that already exists on every
// profile row (`lib/db.ts`), instead of adding a new Dexie store or a schema
// version bump to count real entries across every data-bearing table. A
// profile that is a week old and never synced represents at least a week of
// however she uses the app — journal entries, weight, symptoms, or simply
// coming back — and a week is long enough that losing it would genuinely
// hurt, while still being far short of "day one," when nothing is at risk yet.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Minimum age of the local profile, in days, before the nudge can show.
 *
 * 7 rather than 3: three days can still be the same week as onboarding for
 * someone who onboarded and has not opened the app again yet, which is not
 * "real data at risk," just a stale draft. Seven days is a full week of
 * possible use and a natural point to say "this has been going for a while."
 */
export const ACCOUNT_NUDGE_MIN_PROFILE_AGE_DAYS = 7;

/**
 * How long a dismissal silences the nudge, in days.
 *
 * The founder does not want a one-time popup that vanishes forever, but he
 * also does not want it naggy. Two weeks is long enough that dismissing it
 * once is not immediately followed by seeing it again on the next visit, and
 * short enough that a local-only user with months of data will still see it
 * several more times before her risk of losing that data goes away.
 */
export const ACCOUNT_NUDGE_SNOOZE_DAYS = 14;

export interface AccountNudgeInput {
  /** The local profile row's own `createdAt` (ms epoch), or undefined if there is no profile. */
  profileCreatedAt: number | undefined;
  /** Whether the current device has a signed-in session. */
  hasSession: boolean;
  /** Whether sign-in is even offered in this deployment (`isAuthAvailable()`/`availableProviders()`). */
  authAvailable: boolean;
  now?: number;
}

/**
 * Pure trigger-condition logic, kept separate from the component so it is
 * trivially testable and so nothing about it depends on Dexie, localStorage
 * or a network call.
 *
 * Shows the nudge only when ALL of:
 *  - there is no session (local-only device),
 *  - sign-in is actually available in this deployment,
 *  - the local profile is old enough that it plausibly holds real data.
 */
export function shouldShowAccountNudge({
  profileCreatedAt,
  hasSession,
  authAvailable,
  now = Date.now(),
}: AccountNudgeInput): boolean {
  if (hasSession) return false;
  if (!authAvailable) return false;
  if (typeof profileCreatedAt !== "number") return false;
  return now - profileCreatedAt >= ACCOUNT_NUDGE_MIN_PROFILE_AGE_DAYS * DAY_MS;
}

// --- dismissal persistence -------------------------------------------------
//
// Same shape as `lib/onboarding/draftStorage.ts`: every function swallows its
// own errors. `localStorage` throws in Safari private mode and in a locked-
// down WebView, and the dismissal is a convenience — failing to save it just
// means the nudge may reappear sooner than intended, never that the app
// breaks.

const DISMISSED_UNTIL_KEY = "mibebe.accountNudge.dismissedUntil";

/** Silences the nudge for `ACCOUNT_NUDGE_SNOOZE_DAYS` days from `now`. */
export function dismissAccountNudge(now: number = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DISMISSED_UNTIL_KEY,
      String(now + ACCOUNT_NUDGE_SNOOZE_DAYS * DAY_MS),
    );
  } catch {
    // Nothing to tell the user: the nudge simply may show again sooner.
  }
}

/** True while a previous dismissal is still in its snooze window. */
export function isAccountNudgeDismissed(now: number = Date.now()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISSED_UNTIL_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
}
