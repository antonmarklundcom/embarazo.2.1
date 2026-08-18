import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { PHOTO_BACKUP_STORES } from "@/lib/db";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_PHOTO_BYTES,
  PHOTO_STORES,
  isAllowedContentType,
  isAllowedSize,
  isPhotoStore,
  isValidRecordId,
  keyBelongsTo,
  objectKeyFor,
  userPrefix,
} from "./keys";

// BUILD-PLAN K4. An object key becomes a **capability** the moment it is
// signed, so everything that can appear in one is checked here.

const USER = "8f14e45f-ceea-467a-9d40-a2b1c3d4e5f6";
const OTHER = "11111111-2222-3333-4444-555555555555";

describe("the two photo stores", () => {
  it("are the same list Dexie uses", () => {
    // Two lists kept in step by hand is how a pipeline rots. Same argument
    // lib/sync/stores.ts makes about SYNCED_STORES.
    expect([...PHOTO_STORES].sort()).toEqual([...PHOTO_BACKUP_STORES].sort());
  });

  it("accept nothing else", () => {
    expect(isPhotoStore("photoEntries")).toBe(true);
    expect(isPhotoStore("carnePhotos")).toBe(true);
    for (const value of ["journalEntries", "profile", "", null, 7, {}]) {
      expect(isPhotoStore(value), JSON.stringify(value)).toBe(false);
    }
  });
});

describe("what may be uploaded", () => {
  it("is what a phone camera produces and nothing else", () => {
    for (const type of ALLOWED_CONTENT_TYPES) {
      expect(isAllowedContentType(type)).toBe(true);
    }
    // The bucket is not a general file store.
    for (const type of [
      "application/pdf",
      "text/html",
      "application/octet-stream",
      "image/svg+xml",
      "IMAGE/JPEG",
      "",
      null,
    ]) {
      expect(isAllowedContentType(type), String(type)).toBe(false);
    }
  });

  it("is bounded well above a photo and well below 'somebody else is using my bucket'", () => {
    expect(isAllowedSize(1)).toBe(true);
    expect(isAllowedSize(MAX_PHOTO_BYTES)).toBe(true);
    expect(isAllowedSize(MAX_PHOTO_BYTES + 1)).toBe(false);
    expect(isAllowedSize(0)).toBe(false);
    expect(isAllowedSize(-1)).toBe(false);
    expect(isAllowedSize(1.5)).toBe(false);
    expect(isAllowedSize("1000")).toBe(false);
  });
});

describe("record ids are ours, never user text", () => {
  it("accepts a uuid and a generated id", () => {
    expect(isValidRecordId(USER)).toBe(true);
    expect(isValidRecordId("abc_123-XYZ")).toBe(true);
  });

  it("rejects anything that could climb out of its path segment", () => {
    for (const value of [
      "",
      "..",
      "../../etc/passwd",
      "a/b",
      "a b",
      "a?b=1",
      "a#b",
      "a%2Fb",
      "ñ",
      "x".repeat(65),
      null,
      7,
    ]) {
      expect(isValidRecordId(value), JSON.stringify(value)).toBe(false);
    }
  });
});

describe("objectKeyFor", () => {
  it("puts every object a user owns under one prefix", () => {
    // Which is what makes "delete everything for this account" an enumerable
    // operation rather than a search.
    const key = objectKeyFor(USER, "photoEntries", "abc")!;
    expect(key).toBe(`fotos/${USER}/photoEntries/abc`);
    expect(key.startsWith(userPrefix(USER))).toBe(true);
  });

  it("refuses to build a key from anything unvalidated", () => {
    expect(objectKeyFor("../admin", "photoEntries", "abc")).toBeNull();
    expect(objectKeyFor(USER, "journalEntries" as never, "abc")).toBeNull();
    expect(objectKeyFor(USER, "photoEntries", "../otro/abc")).toBeNull();
    expect(objectKeyFor(USER, "photoEntries", "")).toBeNull();
  });
});

describe("keyBelongsTo", () => {
  it("is true only for the owner's own prefix", () => {
    const key = objectKeyFor(USER, "photoEntries", "abc")!;
    expect(keyBelongsTo(key, USER)).toBe(true);
    expect(keyBelongsTo(key, OTHER)).toBe(false);
  });

  it("is not fooled by a prefix that merely starts the same", () => {
    // `fotos/{USER}x/...` must not read as belonging to USER. The trailing
    // slash in `userPrefix` is what makes that true.
    expect(keyBelongsTo(`fotos/${USER}x/photoEntries/abc`, USER)).toBe(false);
    expect(keyBelongsTo(`otros/${USER}/photoEntries/abc`, USER)).toBe(false);
  });
});

describe("photos are never rendered in /admin (§9)", () => {
  it("is asserted against the admin source, not against a promise", () => {
    // §9's rule is that the panel sees metadata and never health content, and
    // K4 is the first feature to store something that is not text. A count of
    // photos would be fine; a URL to one would not, and the difference is one
    // careless import. So: nothing under app/admin may reach the photo
    // pipeline at all.
    function filesUnder(dir: string): string[] {
      return readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry);
        return statSync(full).isDirectory() ? filesUnder(full) : [full];
      });
    }

    const offenders: string[] = [];
    for (const file of filesUnder(join(process.cwd(), "app", "admin"))) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
      const source = readFileSync(file, "utf8");
      for (const forbidden of [
        "photoBlobs",
        "photoStorage",
        "downloadUrl",
        "photoEntries",
        "carnePhotos",
        "lib/photos",
      ]) {
        if (source.includes(forbidden)) offenders.push(`${file}: ${forbidden}`);
      }
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
