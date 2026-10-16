import { APP_NAME } from "@/lib/brand";

// Owner acceptance — the "Probar avisos" notice.
//
// Pure and dependency-free (bar the brand name) so the service worker, the
// settings screen and the route agree on one set of values.
//
// A test poke carries no body, like every other poke. The phone recognises it
// because the settings screen leaves a short-lived marker in Cache Storage
// right before asking for it; the service worker consumes the marker on the
// next push. Cache Storage rather than Dexie because the worker can read it
// without a schema change, and rather than localStorage because the worker
// cannot read localStorage at all. The marker holds a timestamp, nothing else.

/** Its own cache, so no existing cache name or route rule changes. */
export const PUSH_TEST_CACHE = "mibebe-push-test";
export const PUSH_TEST_KEY = "/__mibebe/push-test";

/** "Ahora" and "en 20 segundos, con la app cerrada". The route accepts only these. */
export const PUSH_TEST_DELAYS_MS = [0, 20_000] as const;

/**
 * How long a marker stays valid: the longest delay plus room for a slow push
 * service. Generous on purpose — the cost of an expired marker is that the
 * test arrives worded as an ordinary weekly notice, which is still a true and
 * successful delivery.
 */
export const PUSH_TEST_WINDOW_MS = 3 * 60 * 1000;

export function isFreshPushTest(requestedAt: number, now: number): boolean {
  return Number.isFinite(requestedAt) && requestedAt <= now + 5_000 && now - requestedAt < PUSH_TEST_WINDOW_MS;
}

/** Where tapping the test opens: back to the switch she is checking. */
export const PUSH_TEST_URL = "/ajustes?avisos=prueba";

export const PUSH_TEST_NOTICE = {
  title: `${APP_NAME}: aviso de prueba`,
  body: "Tus avisos llegan a este teléfono. Tocá para volver a Ajustes.",
  url: PUSH_TEST_URL,
} as const;
