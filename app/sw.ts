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

// ---------------------------------------------------------------------------
// K14 — what the cache is not allowed to hold
// ---------------------------------------------------------------------------
//
// `defaultCache` from @serwist/next contains a same-origin `NetworkFirst` rule
// for `/api/*` and another for document navigations. Both are right for the
// content this app is mostly made of and both were **wrong** for anything
// carrying a session: a companion's snapshot, a photo index, an admin page.
// They were being written to the `apis` and `pages` caches, which meant K2's
// central promise — "revoking a companion cuts everything instantly" — was
// true of the server and false of the phone. Revoke access, go offline, reload:
// the last good answer came straight back out of the cache, with the week, the
// due date and the baby's name in it.
//
// So: two `NetworkOnly` rules, and they sit **before** `...defaultCache`,
// because Serwist takes the first matching rule and `defaultCache`'s
// same-origin patterns would otherwise claim these first.
//
// Offline is not a regression here. A NetworkOnly navigation that cannot reach
// the network falls through to the `/offline` fallback below, which is the
// honest answer: this screen needs the server, and there is nothing safe to
// show without it.
//
// `lib/invariants/swCache.test.ts` reads these two constants back out of this
// file and fails if an API route that reads a session is not covered by the
// first one. Adding a route is how this regresses, so adding a route is what
// the test watches.

/**
 * API paths whose response is scoped to whoever is signed in.
 *
 * `push` is here on the rule rather than on a judgement call: its GET returns
 * only the public VAPID key, which is the same for everyone, but its POST
 * links a subscription to a session and the rule this file enforces is "reads
 * a session → never cached". A route whose exemption depends on somebody
 * re-deriving that argument is a route that leaks the day the handler grows.
 * There is nothing to lose — nothing about subscribing works offline anyway.
 */
export const SESSION_BEARING_API =
  /^\/api\/v1\/(sync|sharing|photos|auth-status|ai|push)(\/|$)/;

/**
 * Pages that render somebody's account, family or admin panel.
 *
 * Matched on the **pathname alone**, deliberately. In an App Router app a
 * "navigation" is usually not a document request at all — tapping a link sends
 * an `RSC: 1` fetch, which `defaultCache` files under `pages-rsc` (and
 * `pages-rsc-prefetch` when the router prefetches on hover). A rule that only
 * caught `request.destination === "document"` would leave the common case —
 * in-app navigation to /familia — cached exactly as before. Nothing under these
 * paths is a static asset (those live under `/_next/`), so there is nothing
 * this over-matches.
 */
export const PRIVATE_NAVIGATION = /^\/(admin|familia|cuenta|ajustes)(\/|$)/;

const serwist = new Serwist({
  precacheEntries: [...(self.__SW_MANIFEST ?? []), ...pageRoutes],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // A3, widened by K14: /api/v1/sync is never cached, in either direction —
    // a cached pull would replay stale records over newer local ones, and a
    // cached push response would clear a dirty flag for a write the server
    // never got. Every other session-bearing route is here for the reason
    // above the constant: a cached copy outlives the access that produced it.
    {
      matcher: ({ url }) => SESSION_BEARING_API.test(url.pathname),
      handler: new NetworkOnly(),
    },
    // K14: and the pages that render those answers. A cached /familia is a
    // cached list of who can see this pregnancy.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && PRIVATE_NAVIGATION.test(url.pathname),
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
