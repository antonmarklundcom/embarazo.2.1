// Placeholder gate (BUILD-PLAN Z1).
//
// Several seed files ship invented businesses, sponsors and events with
// non-working +595 numbers so the app has something to render during
// development. Rendering any of them to a real user is a trust failure —
// a pregnant woman tapping "WhatsApp" and reaching a dead number in an
// emergency-adjacent context is the worst version of it.
//
// Rather than trusting each call site to remember, every seed collection is
// filtered through `publishedOnly()`. Entries light up automatically the
// moment they carry real data, with no other code change.
//
// Detection is deliberately a deep string scan rather than a per-type field
// list: if real data lands but one field still says "(placeholder)" or keeps a
// dummy number, the entry stays hidden instead of half-shipping.

/** Marker used in placeholder names, addresses, venues and organisers. */
export const PLACEHOLDER_TEXT_MARKER = "placeholder";

/** The invented `+595 981 000 0xx` range used across the seed files. */
export const PLACEHOLDER_PHONE_RE = /^\+?595981000\d{3}$/;

/**
 * A well-known public sample video, never a real pregnancy-education one.
 * Used as the stand-in `youtubeId` in `lib/seed/videos.ts`.
 */
export const PLACEHOLDER_YOUTUBE_ID = "dQw4w9WgXcQ";

function stringLooksPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === PLACEHOLDER_YOUTUBE_ID) return true;
  if (PLACEHOLDER_PHONE_RE.test(trimmed.replace(/[\s-]/g, ""))) return true;
  return trimmed.toLowerCase().includes(PLACEHOLDER_TEXT_MARKER);
}

/**
 * True if any string anywhere in the record marks it as placeholder data.
 * Walks nested objects and arrays; non-string values are ignored.
 */
export function isPlaceholderRecord(record: unknown): boolean {
  if (typeof record === "string") return stringLooksPlaceholder(record);
  if (Array.isArray(record)) return record.some(isPlaceholderRecord);
  if (record && typeof record === "object") {
    return Object.values(record).some(isPlaceholderRecord);
  }
  return false;
}

/** Drops every placeholder entry from a seed collection. */
export function publishedOnly<T>(items: readonly T[]): T[] {
  return items.filter((item) => !isPlaceholderRecord(item));
}

/**
 * A second, narrower gate for content that must clear medical review before
 * it renders (D3's food lookup, and any future seed with the same shape):
 * an entry with no `reviewedBy` has not been signed off and must not reach a
 * user, exactly like a placeholder. This reuses the same gate *pattern* as
 * `publishedOnly` (filter the seed array once, at the module boundary) rather
 * than inventing a second mechanism — call sites still only ever render the
 * `PUBLISHED_*` / `REVIEWED_*` export, never the raw seed array.
 */
export function isUnreviewed(record: { reviewedBy?: string }): boolean {
  return !record.reviewedBy || record.reviewedBy.trim().length === 0;
}

/** Drops every entry that hasn't been signed off by a reviewer yet. */
export function reviewedOnly<T extends { reviewedBy?: string }>(items: readonly T[]): T[] {
  return items.filter((item) => !isUnreviewed(item));
}
