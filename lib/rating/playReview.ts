// Growth plan item 14 — when "¿Cómo te está yendo?" may send a happy answer to
// the Play listing instead of WhatsApp.
//
// Two conditions, both required, so the default is today's behaviour:
//
//   1. `NEXT_PUBLIC_PLAY_STORE_URL` is set to a real Play listing URL. Unset by
//      default (the listing does not exist yet); anything that is not an https
//      play.google.com details URL counts as unset, so a typo cannot send
//      somebody to a random page.
//   2. The app is running inside the Android app (a Trusted Web Activity). The
//      TWA opens the site with `document.referrer` = "android-app://<package>/";
//      a review link is useless to somebody reading in a browser, who has not
//      installed anything to review. The referrer is only there on the launch
//      navigation, so the caller remembers it for the session.
//
// Pure: no `window`, so the rule is unit-testable. `components/HomeShortcuts.tsx`
// reads the browser and passes the facts in.

const PLAY_DETAILS = /^https:\/\/play\.google\.com\/store\/apps\/details\?id=[A-Za-z0-9_.]+(&[A-Za-z0-9_.=&-]*)?$/;

/** The listing URL, or `null` when the switch is off or the value is not a Play listing. */
export function playStoreUrl(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim();
  return PLAY_DETAILS.test(value) ? value : null;
}

/** Whether a launch referrer says this page was opened by the Android app. */
export function isTwaReferrer(referrer: string | undefined | null): boolean {
  return (referrer ?? "").startsWith("android-app://");
}

/** Session key remembering the TWA launch across client-side navigations. */
export const TWA_SESSION_KEY = "mibebe.twa";

export function offerPlayReview(input: {
  playUrl: string | null;
  referrer: string | undefined | null;
  rememberedTwa: boolean;
}): boolean {
  return input.playUrl !== null && (input.rememberedTwa || isTwaReferrer(input.referrer));
}
