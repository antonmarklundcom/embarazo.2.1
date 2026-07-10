import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst } from "serwist";

// Service worker (build spec §9). Compiled from app/sw.ts → public/sw.js.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// @serwist/next's manifest precaches build assets (JS, CSS, fonts, icons) but
// NOT the SSG HTML documents. So page HTML is cached at runtime as the user
// visits pages (nido-pages below), and /offline is precached explicitly so
// the navigation fallback always has something to serve.
const precacheEntries: (PrecacheEntry | string)[] = [
  ...(self.__SW_MANIFEST ?? []),
  "/offline",
];

const serwist = new Serwist({
  precacheEntries,
  skipWaiting: true,
  clientsClaim: true,
  // navigationPreload is intentionally OFF: with it on, a navigation offline
  // waits on the (failing) preload response before the strategy can fall back
  // to the cache, which broke offline page loads.
  navigationPreload: false,
  runtimeCaching: [
    // Page navigations FIRST: cache each visited HTML document so it opens
    // offline (the core "funciona sin internet" promise). Must precede
    // defaultCache, whose catch-all otherwise handles document requests and
    // does not serve them offline. Unvisited pages fall back to /offline.
    {
      matcher: ({ request }) => request.destination === "document",
      handler: new NetworkFirst({
        cacheName: "nido-pages",
        networkTimeoutSeconds: 3,
      }),
    },
    // Network-first with cached fallback for the two read APIs (spec §9).
    {
      matcher: ({ url }) =>
        url.pathname === "/api/v1/placements" ||
        url.pathname === "/api/v1/directory",
      handler: new NetworkFirst({
        cacheName: "nido-api",
        networkTimeoutSeconds: 5,
      }),
    },
    ...defaultCache,
  ],
  // Offline fallback (build spec §9): a navigation with no network and no
  // cached copy lands on /offline instead of a browser error page.
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
