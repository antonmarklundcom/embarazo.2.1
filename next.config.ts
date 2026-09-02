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
// Content-Security-Policy is deliberately **Report-Only** to start. This app
// renders `dangerouslySetInnerHTML` article bodies from `lib/seed/articles.ts`
// and Next injects inline bootstrap scripts, so an enforcing policy written
// blind is a policy that blanks the app on somebody's phone in Asunción. The
// honest sequence is: ship it reporting, read what it would have blocked,
// then enforce in a later PR. A Report-Only header that is never promoted is
// theatre — this one is on K18's list to promote.
const SECURITY_HEADERS = [
  // Nobody frames this app. Clickjacking a pregnancy app means clickjacking
  // "borrar mi cuenta", and `frame-ancestors` covers the cases the older
  // X-Frame-Options misses.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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

/**
 * The reporting policy, kept separate because it is the one that will change.
 *
 * `'unsafe-inline'` for scripts is not a resting place — it is what Next's
 * bootstrap needs without a nonce, and writing the report-only policy without
 * it would fill the reports with our own framework instead of anything worth
 * reading.
 */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Provider avatars (Google/Facebook CDNs) and the generated OG images.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // The presigned PUT to object storage (K4) is same-origin-less by design.
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

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
        headers: [
          ...SECURITY_HEADERS,
          {
            key: "Content-Security-Policy-Report-Only",
            value: CSP_REPORT_ONLY,
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
