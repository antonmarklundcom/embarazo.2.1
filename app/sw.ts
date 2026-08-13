import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, NetworkOnly } from "serwist";
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
  // D3 food lookup: explicitly precached like the weeks/guías so "¿Puedo
  // comer...?" works fully offline from first install, not just after a
  // visit — it's meant to be reachable with zero network, ever.
  "/herramientas/comer",
  // D2: the dental screen is pure reading with no state, and the place it is
  // most useful is a waiting room with no signal.
  "/herramientas/dental",
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
    // A3: /api/v1/sync is never cached, in either direction. A cached pull
    // would replay stale records over newer local ones, and a cached push
    // response would clear a dirty flag for a write the server never got.
    // This sits before defaultCache so its same-origin rules cannot claim it.
    {
      matcher: ({ url }) => url.pathname === "/api/v1/sync",
      handler: new NetworkOnly(),
    },
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

// ---------------------------------------------------------------------------
// BUILD-PLAN B5 — push, composed on the device
// ---------------------------------------------------------------------------
//
// The server sends a poke with NO BODY. Everything the notification says is
// written here, from IndexedDB, on the phone. That is what lets prenatal
// reminders exist at all without the server reading `syncRecords.payload`
// (ARCHITECTURE.md §4.3): it knows a time and a category, never an
// appointment, a week or a name.
//
// `userVisibleOnly: true` means we MUST show something for every push we
// receive. So the fallbacks below are not decoration — a push that resolved to
// nothing would be a browser-generated "This site has been updated in the
// background" notice, which is worse than anything we would write ourselves.

const NOTIFICATION_TAG = "mibebe-recordatorio";

/** Read the next appointment straight from Dexie's object store. */
async function readNextAppointment(): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: number | null) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open("mibebe");
    } catch {
      return done(null);
    }

    request.onerror = () => done(null);
    request.onsuccess = () => {
      const database = request.result;
      try {
        const tx = database.transaction("profile", "readonly");
        const all = tx.objectStore("profile").getAll();
        all.onsuccess = () => {
          const rows = (all.result ?? []) as {
            nextAppointment?: number;
            deletedAt?: number | null;
          }[];
          const live = rows.find((row) => !row.deletedAt);
          done(typeof live?.nextAppointment === "number" ? live.nextAppointment : null);
        };
        all.onerror = () => done(null);
      } catch {
        done(null);
      }
    };
  });
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function composeNotification(): Promise<{ title: string; body: string }> {
  const appointment = await readNextAppointment();

  if (appointment !== null) {
    const hoursAway = (appointment - Date.now()) / 3_600_000;
    if (hoursAway > 0 && hoursAway < 48) {
      return {
        title: "Mañana tenés control prenatal",
        body: `A las ${formatTime(appointment)}. Llevá tu carné perinatal.`,
      };
    }
  }

  // The appointment moved or was cleared between scheduling and firing. We
  // still have to show something, so show something true and useless rather
  // than something specific and wrong.
  return {
    title: "Mi Bebé",
    body: "Tocá para ver cómo va tu semana.",
  };
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const { title, body } = await composeNotification();
      await self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        // Replace rather than stack: two identical reminders on a lock screen
        // read as a bug. (`renotify` is deliberately not set — it is absent
        // from lib.dom's NotificationOptions, and its default of false is what
        // we want anyway.)
        tag: NOTIFICATION_TAG,
        data: { url: "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string } | undefined)?.url ?? "/";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus an open tab rather than opening a second one.
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});
