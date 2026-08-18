import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, NetworkOnly } from "serwist";
import { MIN_WEEK, MAX_WEEK } from "@/lib/pregnancy";
import { ARTICLES } from "@/lib/seed/articles";
import {
  companionReminderSentence,
  ownReminderSentence,
} from "@/lib/appointments";

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
  // E6: the questions people ask before trusting an app with a pregnancy.
  // Needing signal to read the answer is a bad first impression.
  "/preguntas",
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

interface LocalReminderState {
  /** The mamá's own next control, if she has one. */
  nextAppointment: number | null;
  /** K8 — whether this device asked to be reminded of somebody else's. */
  companionReminder: boolean;
}

/** Read what the notification needs straight from Dexie's object store. */
async function readLocalReminderState(): Promise<LocalReminderState> {
  return new Promise((resolve) => {
    let settled = false;
    const NOTHING: LocalReminderState = {
      nextAppointment: null,
      companionReminder: false,
    };
    const done = (value: LocalReminderState) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open("mibebe");
    } catch {
      return done(NOTHING);
    }

    request.onerror = () => done(NOTHING);
    request.onsuccess = () => {
      const database = request.result;
      try {
        const tx = database.transaction("profile", "readonly");
        const all = tx.objectStore("profile").getAll();
        all.onsuccess = () => {
          const rows = (all.result ?? []) as {
            nextAppointment?: number;
            companionReminder?: boolean;
            deletedAt?: number | null;
          }[];
          const live = rows.find((row) => !row.deletedAt);
          done({
            nextAppointment:
              typeof live?.nextAppointment === "number"
                ? live.nextAppointment
                : null,
            companionReminder: live?.companionReminder === true,
          });
        };
        all.onerror = () => done(NOTHING);
      } catch {
        done(NOTHING);
      }
    };
  });
}

/**
 * K8 — the control of the pregnancy this device is *accompanying*.
 *
 * Fetched live at push time rather than read from a local copy, and that is
 * the design: K2 keeps no cached companion view precisely so that revoking a
 * companion cuts everything instantly. A revoked companion's phone therefore
 * gets nothing back here and falls through to the generic line, which is the
 * correct outcome. Offline lands in the same place — this is a poke that has
 * to show *something*, not a screen.
 */
async function readCompanionAppointment(): Promise<number | null> {
  try {
    const res = await fetch("/api/v1/sharing", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      views?: {
        role?: string;
        snapshot?: { nextAppointmentAt?: number | null } | null;
      }[];
    };
    const companion = (body.views ?? []).find((view) => view.role !== "owner");
    const at = companion?.snapshot?.nextAppointmentAt;
    return typeof at === "number" ? at : null;
  } catch {
    return null;
  }
}

async function composeNotification(): Promise<{ title: string; body: string }> {
  const now = Date.now();
  const local = await readLocalReminderState();

  // Her own control first: it is the common case, it needs no network, and a
  // device that tracks both would otherwise describe somebody else's.
  const own = ownReminderSentence(local.nextAppointment, now);
  if (own) return own;

  if (local.companionReminder) {
    const companion = companionReminderSentence(
      await readCompanionAppointment(),
      now,
    );
    if (companion) return companion;
  }

  // The appointment moved or was cleared between scheduling and firing, or
  // access was revoked. We still have to show something, so show something
  // true and useless rather than something specific and wrong.
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
