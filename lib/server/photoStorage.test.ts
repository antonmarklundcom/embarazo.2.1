import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { uploadUrl } from "./photoStorage";
import { MAX_PHOTO_BYTES, objectKeyFor } from "@/lib/photos/keys";

// The presigned PUT is a capability, so what it signs is what it permits.
// `routeContract.test.ts` pins the route's schema against its source; this
// drives the signer itself, because the size bound only means something if it
// ends up *inside* the signature — a declared `bytes` the URL does not carry is
// a number the bucket never sees.

const USER = "user-1";
const ENV = {
  PHOTO_STORAGE_ACCESS_KEY: "AKIDEXAMPLE",
  PHOTO_STORAGE_SECRET_KEY: "not-a-real-secret",
  PHOTO_STORAGE_REGION: "us-east-1",
  PHOTO_STORAGE_ENDPOINT: "https://bucket.example.test",
  PHOTO_STORAGE_BUCKET: "mibebe",
};

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const [name, value] of Object.entries(ENV)) {
    saved[name] = process.env[name];
    process.env[name] = value;
  }
});

afterEach(() => {
  for (const name of Object.keys(ENV)) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

const NOW = new Date("2026-09-23T12:00:00Z");
const key = () => objectKeyFor(USER, "photoEntries", "abc123")!;

describe("uploadUrl", () => {
  it("signs the declared size as Content-Length, next to the content type", () => {
    const url = new URL(uploadUrl(USER, key(), "image/jpeg", 245_000, NOW)!);
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe(
      "content-length;content-type;host",
    );
  });

  it("gives a different signature for a different size", () => {
    // Which is the whole point: a URL minted for 245 kB cannot be replayed with
    // a body of any other length.
    const small = new URL(uploadUrl(USER, key(), "image/jpeg", 245_000, NOW)!);
    const large = new URL(uploadUrl(USER, key(), "image/jpeg", 245_001, NOW)!);
    expect(small.searchParams.get("X-Amz-Signature")).not.toBe(
      large.searchParams.get("X-Amz-Signature"),
    );
  });

  it("refuses to sign a size outside the photo bound", () => {
    for (const bytes of [0, -1, 1.5, MAX_PHOTO_BYTES + 1, Number.NaN]) {
      expect(uploadUrl(USER, key(), "image/jpeg", bytes, NOW), String(bytes)).toBeNull();
    }
    expect(uploadUrl(USER, key(), "image/jpeg", MAX_PHOTO_BYTES, NOW)).not.toBeNull();
  });

  it("still refuses another user's key", () => {
    expect(uploadUrl("user-2", key(), "image/jpeg", 245_000, NOW)).toBeNull();
  });
});
