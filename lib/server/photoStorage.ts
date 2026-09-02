import "server-only";

import { presign, type S3Credentials } from "@/lib/photos/sigv4";
import { keyBelongsTo } from "@/lib/photos/keys";

// BUILD-PLAN K4 — the object store, server side.
//
// Discipline copied from `lib/server/db.ts` and `lib/server/auth.ts`, because
// it is the rule that keeps "unconfigured is a supported deployment" true:
// **nothing here reads a secret or connects at import time, and nothing
// throws.** A build with no `PHOTO_STORAGE_*` env vars is a build where photo
// backup does not exist — the route 404s and the settings card says so — not a
// build that crashes when somebody opens the photo diary.
//
// The credentials never leave this module. The browser gets a presigned URL
// with a short life and one object in it; it never gets a key, a token, or a
// bucket name it could vary.

/** How long an upload or download URL lives. Long enough for a photo on 3G. */
export const UPLOAD_URL_TTL_SECONDS = 15 * 60;
export const DOWNLOAD_URL_TTL_SECONDS = 10 * 60;

function readCredentials(
  env: NodeJS.ProcessEnv = process.env,
): S3Credentials | null {
  const accessKeyId = env.PHOTO_STORAGE_ACCESS_KEY?.trim();
  const secretAccessKey = env.PHOTO_STORAGE_SECRET_KEY?.trim();
  const region = env.PHOTO_STORAGE_REGION?.trim();
  const endpoint = env.PHOTO_STORAGE_ENDPOINT?.trim();
  const bucket = env.PHOTO_STORAGE_BUCKET?.trim();

  if (!accessKeyId || !secretAccessKey || !region || !endpoint || !bucket) {
    return null;
  }
  if (!/^https?:\/\//.test(endpoint)) return null;

  return { accessKeyId, secretAccessKey, region, endpoint, bucket };
}

/** True when this deployment can actually store a photo. */
export function isPhotoStorageConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return readCredentials(env) !== null;
}

/**
 * A URL the browser can PUT one photo to.
 *
 * The content type is **signed**, not merely suggested: the object cannot be
 * stored as something else than what the route validated. `keyBelongsTo` is
 * asserted here as well as at the call site — this function is the last place
 * a mistake is still cheap, and after it the URL is a capability.
 */
export function uploadUrl(
  userId: string,
  key: string,
  contentType: string,
  now: Date = new Date(),
): string | null {
  const credentials = readCredentials();
  if (!credentials) return null;
  if (!keyBelongsTo(key, userId)) return null;

  return presign({
    credentials,
    method: "PUT",
    key,
    expiresIn: UPLOAD_URL_TTL_SECONDS,
    now,
    signedHeaders: { "Content-Type": contentType },
  });
}

/** A URL the browser can GET one photo from. Short-lived, single object. */
export function downloadUrl(
  userId: string,
  key: string,
  now: Date = new Date(),
): string | null {
  const credentials = readCredentials();
  if (!credentials) return null;
  if (!keyBelongsTo(key, userId)) return null;

  return presign({
    credentials,
    method: "GET",
    key,
    expiresIn: DOWNLOAD_URL_TTL_SECONDS,
    now,
  });
}

/**
 * Delete one object.
 *
 * The **server** performs this request rather than handing the browser a signed
 * DELETE, for the reason A5 gives about deletion generally: it is the operation
 * that must be provable, and one that depends on a client finishing a request
 * is not. Returns true when the object is gone — including when it was already
 * gone, which is the ordinary case for a retry.
 */
export async function deleteObject(
  userId: string,
  key: string,
): Promise<boolean> {
  const credentials = readCredentials();
  if (!credentials) return false;
  if (!keyBelongsTo(key, userId)) return false;

  try {
    const res = await fetch(
      presign({
        credentials,
        method: "DELETE",
        key,
        expiresIn: 60,
        now: new Date(),
      }),
      { method: "DELETE", signal: AbortSignal.timeout(10_000) },
    );
    // S3 answers 204 for a delete and 204 again for an object that was never
    // there. 404 is what some compatible implementations send instead; both
    // mean "it is not there now", which is what the caller asked for.
    return res.status === 204 || res.status === 200 || res.status === 404;
  } catch {
    return false;
  }
}
