// Minimal in-memory rate limiter for API routes (build spec §7 follow-up).
// Good enough to blunt casual spam of the attribution webhook; not meant to
// withstand a distributed attack. State resets on redeploy/cold start,
// which is an acceptable trade-off for this route's low stakes.

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

const hits = new Map<string, { count: number; windowStart: number }>();

// Bound memory: forget IPs after a while so this can't grow unbounded.
function sweep(now: number) {
  for (const [key, v] of hits) {
    if (now - v.windowStart > WINDOW_MS) hits.delete(key);
  }
}

export function isRateLimited(key: string, now: number = Date.now()): boolean {
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    if (hits.size > 5000) sweep(now);
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

export function clientKeyFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
