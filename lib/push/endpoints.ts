// K14 — which hosts we are willing to POST a push to.
//
// `/api/v1/push` accepts an endpoint URL from an anonymous caller and the
// dispatcher later makes a server-side request to it. Without a whitelist that
// is a server-side request forgery primitive with persistence: subscribe with
// `http://169.254.169.254/latest/meta-data/`, or an internal admin URL, and
// our own host makes the request on a schedule, from inside the network, with
// no user waiting for the answer to look wrong.
//
// The list is the real web-push services, and it is a list of *hosts* rather
// than a pattern, because "ends with .google.com" is how a whitelist becomes an
// open redirect. A browser only ever produces one of these; anything else is
// either a new browser (which we add here, deliberately, one line) or an
// attack.

/** Exact hosts, or a suffix that is itself a registrable domain we trust. */
const PUSH_HOSTS: readonly string[] = [
  // Chrome / Chromium / Edge / Android WebView (FCM).
  "fcm.googleapis.com",
  "android.googleapis.com",
  // Firefox (Mozilla autopush), including its regional deployments.
  "updates.push.services.mozilla.com",
  "updates-autopush.stage.mozaws.net",
  // Windows / Edge legacy (WNS).
  "notify.windows.com",
  // Safari / iOS + macOS web push (APNs).
  "web.push.apple.com",
];

/** Suffixes whose every subdomain belongs to one of the services above. */
const PUSH_HOST_SUFFIXES: readonly string[] = [
  // WNS hands out per-datacentre hosts, e.g. db5p.notify.windows.com.
  ".notify.windows.com",
  // Mozilla's autopush nodes, e.g. updates.push.services.mozilla.com is the
  // documented one; the wss/rest nodes live under this domain too.
  ".push.services.mozilla.com",
];

/**
 * True only for a URL a real browser's PushManager could have produced.
 *
 * https only: a push endpoint is a bearer capability in a URL, and the
 * dispatcher must not be talked into sending it over plaintext. Credentials in
 * the URL are rejected for the same reason a redirect would be — they change
 * who the request is really to.
 */
export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  // A port is never part of a real push endpoint, and allowing one turns a
  // trusted host into a way to reach anything it proxies.
  if (url.port) return false;

  const host = url.hostname.toLowerCase();
  if (PUSH_HOSTS.includes(host)) return true;
  return PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export const ALLOWED_PUSH_HOSTS = PUSH_HOSTS;
