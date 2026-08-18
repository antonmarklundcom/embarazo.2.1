import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// BUILD-PLAN K4 — properties of `/api/v1/photos` and the storage module,
// asserted against their source.
//
// The handler imports `lib/server/auth.ts` (and therefore next-auth), which
// does not load under vitest, so its behaviour is driven end to end in
// `e2e/photo-backup.spec.ts`. What is checked here is the set of properties a
// passing behavioural test would not notice being removed — the ones that are
// true of the code rather than of any one call.

const ROUTE = readFileSync(
  join(process.cwd(), "app", "api", "v1", "photos", "route.ts"),
  "utf8",
);

const STORAGE = readFileSync(
  join(process.cwd(), "lib", "server", "photoStorage.ts"),
  "utf8",
);

describe("the key is built from the session, never from the body", () => {
  it("passes ctx.userId into objectKeyFor, and nothing else", () => {
    // A caller can name a record. It must not be able to name a user.
    expect(ROUTE).toContain("objectKeyFor(ctx.userId, data.store, data.recordId)");
    expect(ROUTE).not.toMatch(/objectKeyFor\(\s*data\./);
    // And there is no `userId` field anywhere in the accepted vocabulary.
    const union = ROUTE.slice(
      ROUTE.indexOf("const ActionSchema"),
      ROUTE.indexOf("function unavailable"),
    );
    expect(union).not.toContain("userId");
    expect(union).not.toContain("objectKey");
  });

  it("re-checks the prefix inside the signer, after the route has checked it", () => {
    // The last place a mistake is still cheap. After this the URL is a
    // capability.
    for (const fn of ["uploadUrl", "downloadUrl", "deleteObject"]) {
      const start = STORAGE.indexOf(`export ${fn === "deleteObject" ? "async " : ""}function ${fn}`);
      expect(start, fn).toBeGreaterThan(-1);
      const body = STORAGE.slice(start, STORAGE.indexOf("\n}", start));
      expect(body, fn).toContain("keyBelongsTo(key, userId)");
    }
  });
});

describe("what may be signed is whitelisted before anything is signed", () => {
  it("validates the content type and the size as enums and bounds", () => {
    const union = ROUTE.slice(
      ROUTE.indexOf("const ActionSchema"),
      ROUTE.indexOf("function unavailable"),
    );
    expect(union).toContain("contentType: z.enum(ALLOWED_CONTENT_TYPES)");
    expect(union).not.toMatch(/contentType:\s*z\.string/);
    expect(union).toContain("max(MAX_PHOTO_BYTES)");
    // Every action strict, so an extra key is a 400 and not a shrug.
    const objects = union.match(/\.object\(/g)?.length ?? 0;
    expect(union.match(/\.strict\(\)/g)?.length).toBe(objects);
  });
});

describe("no URL this app issues lasts long", () => {
  it("caps the presign TTLs well under an hour", () => {
    const upload = /UPLOAD_URL_TTL_SECONDS = (\d+) \* (\d+)/.exec(STORAGE);
    const download = /DOWNLOAD_URL_TTL_SECONDS = (\d+) \* (\d+)/.exec(STORAGE);
    expect(upload).not.toBeNull();
    expect(download).not.toBeNull();
    expect(Number(upload![1]) * Number(upload![2])).toBeLessThanOrEqual(3600);
    expect(Number(download![1]) * Number(download![2])).toBeLessThanOrEqual(3600);
  });
});

describe("the credentials never leave the server module", () => {
  it("reads the environment in exactly one place", () => {
    // `readCredentials` is the only thing that touches PHOTO_STORAGE_*, and
    // nothing exports it. A second reader is a second place to get the
    // unconfigured case wrong.
    const start = STORAGE.indexOf("function readCredentials");
    const body = STORAGE.slice(start, STORAGE.indexOf("\n}", start));
    // Every one of the five variables is read inside readCredentials, and the
    // only other mention in the file is the comment explaining it.
    expect(body.match(/PHOTO_STORAGE_/g)).toHaveLength(5);
    expect(
      STORAGE.replace(body, "").match(/PHOTO_STORAGE_/g) ?? [],
    ).toHaveLength(1);
    // And nothing exports it: a second reader is a second place to get the
    // unconfigured case wrong.
    expect(STORAGE).not.toMatch(/export function readCredentials/);
  });

  it("is never imported by a client component", () => {
    expect(STORAGE.startsWith('import "server-only";')).toBe(true);
  });

  it("does not read a secret at import time", () => {
    // Same discipline as lib/server/db.ts and lib/server/auth.ts: an
    // unconfigured build is a supported configuration, not an error state.
    const beforeFirstFunction = STORAGE.slice(0, STORAGE.indexOf("function "));
    expect(beforeFirstFunction).not.toContain("process.env");
  });
});

describe("opting out and deleting an account both remove the objects", () => {
  it("deletes objects before rows on the opt-out path", () => {
    const block = ROUTE.slice(
      ROUTE.indexOf('data.action === "delete-all"'),
      ROUTE.indexOf("const objectKey ="),
    );
    expect(block.indexOf("deleteObject")).toBeLessThan(
      block.indexOf("deleteAllPhotoRows"),
    );
  });

  it("nulls a deleted photo's payload rather than keeping it as a tombstone", () => {
    const server = readFileSync(
      join(process.cwd(), "lib", "server", "photos.ts"),
      "utf8",
    );
    const start = server.indexOf("export async function markPhotoDeleted");
    const body = server.slice(start, server.indexOf("\nexport ", start + 1));
    // A3 already applies this rule to a deleted sync record: there is no reason
    // to keep the week of a photo the user just deleted.
    expect(body).toContain("payload: null");
  });
});
