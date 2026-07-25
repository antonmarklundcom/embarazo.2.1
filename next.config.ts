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

const nextConfig = {
  reactStrictMode: true,
  // NOTE: never use output: 'export'. Hostinger runs the standard Node server (SSR + API routes).
};

export default withSerwist(nextConfig);
