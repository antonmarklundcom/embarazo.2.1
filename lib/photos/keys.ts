// BUILD-PLAN K4 — object keys, and the rules about what may be uploaded.
//
// Pure, and shared by the client and the route, so "what counts as a photo" has
// one definition. The route validates against these before it signs anything:
// a presigned PUT is a capability, and one issued for an unchecked key is a
// capability to write anywhere in the bucket.

export const PHOTO_STORES = ["photoEntries", "carnePhotos"] as const;
export type PhotoStore = (typeof PHOTO_STORES)[number];

export function isPhotoStore(value: unknown): value is PhotoStore {
  return (
    typeof value === "string" && (PHOTO_STORES as readonly string[]).includes(value)
  );
}

/**
 * What a phone camera produces, and nothing else.
 *
 * The bucket is not a general file store; it holds two kinds of photograph. A
 * whitelist means an upload URL cannot be turned into somewhere to park
 * arbitrary content.
 */
export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PhotoContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

export function isAllowedContentType(value: unknown): value is PhotoContentType {
  return (
    typeof value === "string" &&
    (ALLOWED_CONTENT_TYPES as readonly string[]).includes(value)
  );
}

/**
 * 12 MB. Comfortably above a modern phone photo and far below "somebody is
 * using my bucket for something else".
 */
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

export function isAllowedSize(bytes: unknown): bytes is number {
  return (
    typeof bytes === "number" &&
    Number.isInteger(bytes) &&
    bytes > 0 &&
    bytes <= MAX_PHOTO_BYTES
  );
}

/** Record ids are ours: a uuid or a Dexie-derived id, never user text. */
const RECORD_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidRecordId(value: unknown): value is string {
  return typeof value === "string" && RECORD_ID.test(value);
}

/**
 * Where one photo lives.
 *
 * `fotos/{userId}/{store}/{recordId}`. Two properties matter:
 *
 *  1. **The user id is a path segment**, so every object a user owns is under
 *     one prefix — which is what makes "delete everything for this account"
 *     an enumerable operation rather than a search.
 *  2. **Every segment is constrained** (`isValidRecordId`, the store enum, and
 *     a user id the server took from the session, never from a request body).
 *     A key is a capability once it is signed; one built from unvalidated input
 *     is a capability to write over somebody else's photo.
 */
export function objectKeyFor(
  userId: string,
  store: PhotoStore,
  recordId: string,
): string | null {
  if (!isValidRecordId(userId)) return null;
  if (!isPhotoStore(store)) return null;
  if (!isValidRecordId(recordId)) return null;
  return `fotos/${userId}/${store}/${recordId}`;
}

/** Everything belonging to one account, for deletion. */
export function userPrefix(userId: string): string {
  return `fotos/${userId}/`;
}

/**
 * Does this key belong to this user?
 *
 * Checked on the way *out* as well as on the way in: a signed URL is only ever
 * issued for a key that starts with the caller's own prefix, so a bug in key
 * construction cannot become a read of somebody else's photo.
 */
export function keyBelongsTo(key: string, userId: string): boolean {
  return key.startsWith(userPrefix(userId));
}
