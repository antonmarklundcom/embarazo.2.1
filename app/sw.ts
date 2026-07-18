import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst } from "serwist";
import { MIN_WEEK, MAX_WEEK } from "@/lib/pregnancy";
import { ARTICLES } from "@/lib/seed/articles";

// Service worker (build spec §9). Compiled from app/sw.ts → public/sw.js.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// __SW_MANIFEST only contains build-time static assets (JS/CSS chunks,
// public/ files) — prerendered page ROUTES are served by the Next.js
// server per-request and are never added to it automatically, even
// though they're statically generated. List them explicitly so the app
// shell, all 42 /semana/[n] pages, and the guías are genuinely precached
// and available offline on first install (not just after a visit).
const pageRoutes: string[] = [
  "/",
  "/guias",
  ...Array.from(
    { length: MAX_WEEK - MIN_WEEK + 1 },
    (_, i) => `/semana/${MIN_WEEK + i}`,
  ),
  ...ARTICLES.map((a) => `/guias/${a.slug}`),
];

const serwist = new Serwist({
  precacheEntries: [...(self.__SW_MANIFEST ?? []), ...pageRoutes],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Network-first with cached fallback for the two read APIs (spec §9).
    {
      matcher: ({ url }) =>
        url.pathname === "/api/v1/placements" ||
        url.pathname === "/api/v1/directory",
      handler: new NetworkFirst({
        cacheName: "mibebe-api",
        networkTimeoutSeconds: 5,
      }),
    },
    ...defaultCache,
  ],
  // Offline fallback (build spec §9): any navigation that isn't precached
  // and can't reach the network lands on /offline instead of a browser
  // error page. /offline itself is precached automatically (app shell).
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
