import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession, isAuthAvailable } from "@/lib/server/auth";
import { dbOrNull } from "@/lib/server/db";
import {
  allObjectKeys,
  deleteAllPhotoRows,
  listPhotos,
  markPhotoDeleted,
  recordPhoto,
} from "@/lib/server/photos";
import {
  deleteObject,
  downloadUrl,
  isPhotoStorageConfigured,
  uploadUrl,
} from "@/lib/server/photoStorage";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";
import { MAX_PAYLOAD_BYTES } from "@/lib/sync/protocol";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_PHOTO_BYTES,
  PHOTO_STORES,
  objectKeyFor,
} from "@/lib/photos/keys";

// BUILD-PLAN K4 — opt-in photo backup (ARCHITECTURE.md §4.4, amended).
//
// The route never touches a photo's bytes. It issues **short-lived presigned
// URLs for one object each**, and it keeps the index of what exists. That split
// is the design: the credentials stay in `lib/server/photoStorage.ts`, the
// browser gets a capability that expires, and a Hostinger Node process is not
// asked to proxy 12 MB of image on a 3G upload.
//
// Three properties are enforced here rather than assumed:
//
//  1. **Every key is built from the session's user id**, never from the body.
//     A caller can name a `recordId`; it cannot name a user. `objectKeyFor`
//     then validates every segment, and `photoStorage` re-checks the prefix
//     before signing. A signed URL is a capability, and one issued for an
//     unvalidated key is a capability to write over somebody else's photo.
//  2. **The content type and size are whitelisted before signing**, so an
//     upload URL cannot become somewhere to park arbitrary content.
//  3. **Nothing here can read a photo's metadata.** It arrives as an opaque
//     payload and is stored as one (§4.3).
//
// Unconfigured is a supported deployment: with no `PHOTO_STORAGE_*` env vars
// this 404s, exactly like `/api/auth/*` without `AUTH_SECRET`.

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" } as const;

const StoreSchema = z.enum(PHOTO_STORES);
const RecordIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

const ActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("upload-url"),
      store: StoreSchema,
      recordId: RecordIdSchema,
      contentType: z.enum(ALLOWED_CONTENT_TYPES),
      bytes: z.number().int().positive().max(MAX_PHOTO_BYTES),
    })
    .strict(),
  z
    .object({
      action: z.literal("confirm"),
      store: StoreSchema,
      recordId: RecordIdSchema,
      contentType: z.enum(ALLOWED_CONTENT_TYPES),
      bytes: z.number().int().positive().max(MAX_PHOTO_BYTES),
      updatedAt: z.number().int().positive(),
      // Opaque. Never inspected — the server hands it back and nothing else.
      payload: z.unknown().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("delete"),
      store: StoreSchema,
      recordId: RecordIdSchema,
    })
    .strict(),
  // The opt-out. Everything, now, objects included.
  z.object({ action: z.literal("delete-all") }).strict(),
])
  // K14: "bounded in size" was a comment, not a rule. A `payload` is stored
  // verbatim and returned verbatim, so with no cap the `confirm` action was a
  // general-purpose key-value store that happened to live in the photo index —
  // authenticated, but unmetered. This is the same 64 KB bound
  // `lib/sync/protocol.ts` puts on a sync record's payload, and for the same
  // reason: generous for the handful of fields a photo has, hostile to
  // anything else.
  //
  // It hangs off the union rather than the `confirm` member because zod's
  // `discriminatedUnion` takes objects, not the `ZodEffects` a `.refine()`
  // produces — a member-level refine throws at module load.
  .refine(
    (value) =>
      !("payload" in value) ||
      value.payload == null ||
      JSON.stringify(value.payload).length <= MAX_PAYLOAD_BYTES,
    { message: "payload demasiado grande" },
  );

function unavailable() {
  return NextResponse.json(
    { error: "no disponible" },
    { status: 404, headers: HEADERS },
  );
}

async function context(req: NextRequest) {
  // K14 — throttled like sync and sharing. This route mints presigned URLs,
  // so an unthrottled caller is one who can mint them as fast as the network
  // allows.
  if (isRateLimited(`photos:${clientKeyFromHeaders(req.headers)}`)) {
    return {
      error: NextResponse.json(
        { error: "demasiadas solicitudes" },
        { status: 429, headers: HEADERS },
      ),
    } as const;
  }
  // Photo backup needs an account (whose photos are these?) AND a database
  // (where is the index?) AND a bucket. Any of the three missing is "this
  // deployment does not have the feature", not an error.
  if (!isAuthAvailable() || !isPhotoStorageConfigured()) {
    return { error: unavailable() } as const;
  }
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "sesión requerida" },
        { status: 401, headers: HEADERS },
      ),
    } as const;
  }
  const database = dbOrNull();
  if (!database) return { error: unavailable() } as const;
  return { userId, database } as const;
}

/**
 * What this account has stored, with a download URL for each live photo.
 *
 * `?since=` lets a second device pull only what changed, the same cursor idea
 * A3's sync uses. Tombstones are returned too — that is how a device learns a
 * photo was deleted elsewhere instead of re-uploading it forever.
 */
export async function GET(req: NextRequest) {
  const ctx = await context(req);
  if ("error" in ctx) return ctx.error;

  for (const key of req.nextUrl.searchParams.keys()) {
    if (key !== "since") {
      return NextResponse.json(
        { error: `parámetro no permitido: ${key}` },
        { status: 400, headers: HEADERS },
      );
    }
  }

  const rawSince = req.nextUrl.searchParams.get("since");
  const since = rawSince === null ? 0 : Number(rawSince);
  if (!Number.isFinite(since) || since < 0) {
    return NextResponse.json(
      { error: "since inválido" },
      { status: 400, headers: HEADERS },
    );
  }

  const rows = await listPhotos(ctx.database, ctx.userId, since);

  return NextResponse.json(
    {
      photos: rows.map((row) => ({
        store: row.store,
        recordId: row.recordId,
        contentType: row.contentType,
        bytes: row.bytes,
        payload: row.payload,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
        serverUpdatedAt: row.serverUpdatedAt,
        // Only for a live photo, and only for the caller's own object.
        downloadUrl: row.deletedAt
          ? null
          : downloadUrl(ctx.userId, row.objectKey),
      })),
      serverTime: Date.now(),
    },
    { headers: HEADERS },
  );
}

export async function POST(req: NextRequest) {
  const ctx = await context(req);
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "cuerpo inválido" },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "pedido inválido" },
      { status: 400, headers: HEADERS },
    );
  }

  const data = parsed.data;
  const now = Date.now();

  if (data.action === "delete-all") {
    // The opt-out. Objects first — an orphaned row is recoverable, an orphaned
    // object is not — and only then the rows.
    const keys = await allObjectKeys(ctx.database, ctx.userId);
    let deleted = 0;
    for (const row of keys) {
      if (await deleteObject(ctx.userId, row.objectKey)) deleted += 1;
    }
    await deleteAllPhotoRows(ctx.database, ctx.userId);
    return NextResponse.json({ ok: true, deleted }, { headers: HEADERS });
  }

  // Every key is built here, from the session's user id. A caller can name a
  // record; it cannot name a user.
  const objectKey = objectKeyFor(ctx.userId, data.store, data.recordId);
  if (!objectKey) {
    return NextResponse.json(
      { error: "pedido inválido" },
      { status: 400, headers: HEADERS },
    );
  }

  if (data.action === "upload-url") {
    const url = uploadUrl(ctx.userId, objectKey, data.contentType);
    if (!url) return unavailable();
    return NextResponse.json({ url, contentType: data.contentType }, { headers: HEADERS });
  }

  if (data.action === "confirm") {
    await recordPhoto(
      ctx.database,
      ctx.userId,
      {
        store: data.store,
        recordId: data.recordId,
        objectKey,
        contentType: data.contentType,
        bytes: data.bytes,
        payload: data.payload ?? null,
        updatedAt: data.updatedAt,
      },
      now,
    );
    return NextResponse.json({ ok: true }, { headers: HEADERS });
  }

  // delete: the tombstone first, then the object.
  //
  // The opposite order to `delete-all`, and for a reason: the tombstone keeps
  // `objectKey`, so an interruption between the two leaves a row that still
  // knows what to delete and a retry finishes the job. What must never happen
  // is the row disappearing while the bytes remain, and that is impossible in
  // this order. The row survives so a second device learns the photo is gone
  // rather than re-uploading it forever; its payload does not.
  const key = await markPhotoDeleted(
    ctx.database,
    ctx.userId,
    data.store,
    data.recordId,
    now,
  );
  if (key) await deleteObject(ctx.userId, key);
  return NextResponse.json({ ok: true }, { headers: HEADERS });
}
