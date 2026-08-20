"use client";

// K14 — the caches that must not survive a sign-out.
//
// The NetworkOnly rules in `app/sw.ts` stop new private responses being
// written. They do nothing about the ones already on the phone: a user who
// signed in, used the app, and only then updated to this build still has a
// `pages` entry for /familia and an `apis` entry for /api/v1/sharing, written
// before the fix. An old cache entry is exactly the thing K14 exists to
// delete — a copy of somebody's pregnancy that outlives access to it.
//
// So sign-out drops them by name. Named, not "delete every cache": the
// precache holds the 42 week pages and the guías, which are the same public
// content for everyone and are what makes the app work offline. Wiping those
// on sign-out would trade a security fix for a broken app on the next bus ride.

/**
 * Caches @serwist/next's `defaultCache` can write a session-scoped response
 * into. `apis` and `pages` are the two K14 names; the two RSC caches are here
 * because in an App Router app they are where a navigation actually lands
 * (see `PRIVATE_NAVIGATION` in `app/sw.ts`), and `next-data` because a data
 * response is no less private for being JSON.
 */
export const PRIVATE_CACHE_NAMES = [
  "apis",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "next-data",
] as const;

/**
 * Best-effort, and never throws.
 *
 * It runs on the way out of a session, in front of a redirect that must happen
 * whether or not this succeeds. A sign-out that failed because the Cache API
 * was unavailable would be a worse bug than the one being fixed.
 */
export async function purgePrivateCaches(): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    await Promise.all(
      PRIVATE_CACHE_NAMES.map((name) => caches.delete(name).catch(() => false)),
    );
  } catch {
    // No Cache API (old browser, non-secure context, test environment).
  }
}
