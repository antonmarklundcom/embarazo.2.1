import withSerwistInit from "@serwist/next";
import { assertLaunchReady } from "./lib/launchChecks";

// BUILD-PLAN Z2: block a configured deployment build that would ship a
// placeholder medical byline. No-op for local and CI builds (no APP_URL).
assertLaunchReady(process.env);

const withSerwist = withSerwistInit({
  // Service worker source compiled to public/sw.js (see §9 of the build spec).
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Serwist is disabled in development to avoid caching headaches while iterating.
  disable: process.env.NODE_ENV === "development",
});

// K14 — response headers.
//
// Everything here is a header the app can set for itself, which matters
// because the deployment target is Hostinger managed Node.js: there is no
// edge config, no WAF and no reverse proxy of ours to put these in. If they
// are not in the app they do not exist.
//
// V1 — the Content-Security-Policy is **enforced**. It shipped Report-Only
// first, deliberately, because this app renders `dangerouslySetInnerHTML`
// article bodies and Next injects inline bootstrap scripts, and an enforcing
// policy written blind is a policy that blanks the app on somebody's phone in
// Asunción. That period is over: the policy below is the one that was being
// reported on, with every source narrowed to the feature that needs it, and
// `e2e/csp.spec.ts` walks every route in the sitemap plus the flows that load
// blob, data and third-party content with a `securitypolicyviolation`
// listener attached. There is no Report-Only header any more — one policy,
// enforced, is the only kind that is not theatre.
//
// `script-src 'self' 'unsafe-inline'` is the documented residual. Removing it
// needs a per-request nonce, a nonce needs `middleware.ts`, and the
// no-middleware invariant (`lib/invariants/middleware.test.ts`) wins: Next has
// shipped more than one middleware auth-bypass CVE, and none of them reached
// this app. An XSS-hardening measure bought with an auth-bypass surface is a
// bad trade for a pregnancy app.

/** The object-storage origin the browser talks to directly, if configured. */
function photoStorageOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  // K4 hands the browser a presigned PUT/GET straight to object storage, so
  // that host is a real `connect-src` entry rather than a guess. Read here
  // rather than hardcoded because the endpoint is per-deployment; a build with
  // no photo storage configured makes no such request and gets no such source.
  const endpoint = env.PHOTO_STORAGE_ENDPOINT?.trim();
  if (!endpoint) return null;
  try {
    const { protocol, origin } = new URL(endpoint);
    return protocol === "https:" ? origin : null;
  } catch {
    return null;
  }
}

/**
 * The enforced policy.
 *
 * Every source below names the feature that needs it. A source with no feature
 * next to it is a source to delete.
 */
function contentSecurityPolicy(env: NodeJS.ProcessEnv = process.env): string {
  const storage = photoStorageOrigin(env);

  return [
    "default-src 'self'",
    // See the note above: Next's inline bootstrap, without a nonce, without
    // middleware. No wildcard host is allowed in here, ever — `lib/invariants/
    // csp.test.ts` fails the build if one appears.
    "script-src 'self' 'unsafe-inline'",
    // Tailwind is a stylesheet, but React still writes inline `style`
    // attributes (the directory banner gradient, the progress bars).
    "style-src 'self' 'unsafe-inline'",
    [
      "img-src 'self'",
      // `data:` — the AI baby render (`/herramientas/bebe-ia`) comes back as a
      // base64 data URL, and the inlined SVG icons.
      "data:",
      // `blob:` — the photo diary previews a chosen file from an object URL
      // before anything leaves the phone.
      "blob:",
      // Provider avatars, rendered `unoptimized` by `components/AccountCard`
      // because the optimizer would need a remotePatterns list tracking
      // Google's hostnames forever. These are those hostnames.
      "https://*.googleusercontent.com",
      "https://*.fbcdn.net",
      "https://platform-lookaside.fbsbx.com",
    ].join(" "),
    // `next/font/google` self-hosts at build time, so the faces are same-origin;
    // `data:` is for the inline fallback metrics Next emits.
    "font-src 'self' data:",
    // Everything the app fetches is its own API, plus the presigned upload and
    // download in `lib/photos/client.ts` when photo storage is configured.
    ["connect-src 'self'", storage].filter(Boolean).join(" "),
    // The video gallery (`/guias/videos`) embeds youtube-nocookie and nothing
    // else. Narrower than the inherited `default-src 'self'`, which would have
    // blocked it outright.
    "frame-src https://www.youtube-nocookie.com",
    // The Serwist service worker, compiled to `/sw.js`. Same origin, but
    // `worker-src` does not inherit from `default-src` in every engine.
    "worker-src 'self'",
    // Nobody frames this app. Clickjacking a pregnancy app means clickjacking
    // "borrar mi cuenta", and `frame-ancestors` covers the cases the older
    // X-Frame-Options misses.
    "frame-ancestors 'none'",
    "base-uri 'self'",
    // Sign-in is a server action (a same-origin fetch), not a cross-origin
    // form POST, so 'self' is the whole of it.
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

function securityHeaders(env: NodeJS.ProcessEnv = process.env) {
  return [
    // One CSP header, enforced. `frame-ancestors 'none'` lives inside it now
    // rather than in a second header of its own — two `Content-Security-Policy`
    // headers intersect, and an intersection is a policy nobody can read.
    { key: "Content-Security-Policy", value: contentSecurityPolicy(env) },
    { key: "X-Frame-Options", value: "DENY" },
    // Don't leak the path. `/semana/31` in a Referer header tells a sponsor's
    // server how far along the visitor is, which is exactly the health datum
    // ARCHITECTURE.md §4.6 says never reaches them.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Nothing in this app uses a camera, a microphone or a location. Photos
    // arrive through a file input, which this does not affect.
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Two years, subdomains included. The PWA is https-only anyway (a service
    // worker requires it), so this closes the first plaintext request rather
    // than changing what the app can do.
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
  ];
}

const nextConfig = {
  reactStrictMode: true,
  // NOTE: never use output: 'export'. Hostinger runs the standard Node server (SSR + API routes).
  experimental: {
    // Next defaults its build workers to os.cpus().length - 1, which on
    // Hostinger's shared box is the physical core count of the host, not
    // this account's share. Each worker is a Node process, counted against
    // the account-wide 200 "Max Processes" cap shared by 9 apps. One worker
    // keeps a deploy from tipping the account over the cap. Same fix as
    // vendercrm PR #84, propia.node PR #81, trabajo PR #82.
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ];
  },
};

export default withSerwist(nextConfig);
