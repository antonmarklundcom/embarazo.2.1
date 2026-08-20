// Minimal in-memory rate limiter for API routes (build spec §7 follow-up).
// Good enough to blunt casual spam of the attribution webhook; not meant to
// withstand a distributed attack. State resets on redeploy/cold start,
// which is an acceptable trade-off for this route's low stakes.

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

/**
 * K14 — the allowance for cheap, read-only routes.
 *
 * 30/minute is the right number for a route that writes, signs a URL or costs
 * money. It is the wrong number for `/api/v1/auth-status`, `/directory` and
 * `/placements`, which the app itself asks for on every open and which answer
 * from memory. The key is an IP address, so a clinic waiting room, a household
 * or a school behind one NAT is a *single* bucket — throttling those three at
 * 30 would present as "the app is broken on this wifi", which is a worse
 * outcome than the flood it would be preventing.
 *
 * The e2e suite found this on the first run: parallel workers share
 * 127.0.0.1, and the suite tripped its own limiter.
 */
export const CHEAP_READ_LIMIT = 300;

const hits = new Map<string, { count: number; windowStart: number }>();

// Bound memory: forget IPs after a while so this can't grow unbounded.
function sweep(now: number) {
  for (const [key, v] of hits) {
    if (now - v.windowStart > WINDOW_MS) hits.delete(key);
  }
}

export function isRateLimited(
  key: string,
  now: number = Date.now(),
  max: number = MAX_REQUESTS_PER_WINDOW,
): boolean {
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    if (hits.size > 5000) sweep(now);
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

/**
 * The client's address, as far as this deployment can know it.
 *
 * K14: the **rightmost** `X-Forwarded-For` entry, not the leftmost.
 *
 * `X-Forwarded-For` is append-only and entirely client-controlled up to the
 * first proxy we operate. Reading the leftmost entry means reading whatever
 * the caller wrote, so a single attacker sending
 * `X-Forwarded-For: <random>` per request got a fresh bucket every time and
 * the limiter counted to one, forever. It also let them fill somebody else's
 * bucket by naming their address.
 *
 * The rightmost entry is the one appended by the proxy nearest us, which is
 * the only one no client can forge. On Hostinger that is the real client
 * address; behind an additional trusted proxy it would be that proxy's, which
 * over-groups rather than under-counts — the safe direction for a limiter.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const rightmost = parts[parts.length - 1];
    if (rightmost) return rightmost;
  }
  return headers.get("x-real-ip") ?? "unknown";
}
