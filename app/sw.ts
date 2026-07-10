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

const serwist = new Serwist({
  // Precache the app shell + all 42 /semana/[n] pages + the guías (they are
  // statically generated, so they land in __SW_MANIFEST automatically).
  precacheEntries: self.__SW_MANIFEST,
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
