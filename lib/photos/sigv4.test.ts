import { describe, expect, it } from "vitest";
import { createHash, createHmac } from "node:crypto";

import {
  MAX_EXPIRES_IN,
  amzDate,
  presign,
  presignParts,
  uriEncode,
  type S3Credentials,
} from "./sigv4";

// BUILD-PLAN K4. Signing is the kind of code that is either exactly right or
// silently broken, and a wrong signature reports as "403 SignatureDoesNotMatch"
// with no clue which of six strings was wrong. So this checks the intermediate
// strings, and re-derives the expected signature independently rather than
// pasting in whatever the implementation happened to produce.

const CREDENTIALS: S3Credentials = {
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
  endpoint: "https://examplebucket.s3.amazonaws.com",
  bucket: "mibebe",
};

const NOW = new Date("2013-05-24T00:00:00Z");

describe("uriEncode", () => {
  it("encodes the characters encodeURIComponent leaves alone", () => {
    // The ones nobody tests with, and the ones that produce a signature
    // mismatch on exactly the keys that contain them.
    expect(uriEncode("!'()*")).toBe("%21%27%28%29%2A");
  });

  it("leaves the unreserved set alone", () => {
    expect(uriEncode("aZ09-._~")).toBe("aZ09-._~");
  });

  it("encodes slashes only when asked", () => {
    expect(uriEncode("a/b")).toBe("a%2Fb");
    expect(uriEncode("a/b", false)).toBe("a/b");
  });

  it("encodes non-ASCII byte by byte, as UTF-8", () => {
    expect(uriEncode("ñ")).toBe("%C3%B1");
  });
});

describe("amzDate", () => {
  it("produces the basic-format timestamp AWS wants", () => {
    expect(amzDate(new Date("2013-05-24T00:00:00Z"))).toEqual({
      amz: "20130524T000000Z",
      date: "20130524",
    });
  });
});

describe("presignParts", () => {
  const input = {
    credentials: CREDENTIALS,
    method: "GET" as const,
    key: "fotos/user-1/abc.jpg",
    expiresIn: 900,
    now: NOW,
  };

  it("builds the canonical request AWS's spec describes", () => {
    const { canonicalRequest } = presignParts(input);
    const lines = canonicalRequest.split("\n");

    expect(lines[0]).toBe("GET");
    // Path-style addressing: /bucket/key, with the key's slashes intact.
    expect(lines[1]).toBe("/mibebe/fotos/user-1/abc.jpg");
    // Query parameters sorted by name, each encoded.
    expect(lines[2]).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
    expect(lines[2]).toContain(
      "X-Amz-Credential=AKIDEXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request",
    );
    expect(lines[2]).toContain("X-Amz-Expires=900");
    expect(lines[3]).toBe("host:examplebucket.s3.amazonaws.com");
    // The body is uploaded by the browser afterwards, so its hash is unknown.
    expect(lines[lines.length - 1]).toBe("UNSIGNED-PAYLOAD");
  });

  it("builds the string to sign from the hash of that canonical request", () => {
    const { canonicalRequest, stringToSign } = presignParts(input);
    expect(stringToSign.split("\n")).toEqual([
      "AWS4-HMAC-SHA256",
      "20130524T000000Z",
      "20130524/us-east-1/s3/aws4_request",
      createHash("sha256").update(canonicalRequest, "utf8").digest("hex"),
    ]);
  });

  it("signs it with the derived key, re-derived here independently", () => {
    // The four-step derivation from AWS's documentation, written out longhand
    // so this test fails if the implementation's version drifts rather than
    // agreeing with itself.
    const { stringToSign, signature } = presignParts(input);
    const kDate = createHmac("sha256", `AWS4${CREDENTIALS.secretAccessKey}`)
      .update("20130524")
      .digest();
    const kRegion = createHmac("sha256", kDate).update("us-east-1").digest();
    const kService = createHmac("sha256", kRegion).update("s3").digest();
    const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
    expect(signature).toBe(
      createHmac("sha256", kSigning).update(stringToSign).digest("hex"),
    );
  });

  it("changes the signature when anything signed changes", () => {
    const base = presignParts(input).signature;
    expect(presignParts({ ...input, method: "PUT" }).signature).not.toBe(base);
    expect(presignParts({ ...input, key: "otra.jpg" }).signature).not.toBe(base);
    expect(presignParts({ ...input, expiresIn: 901 }).signature).not.toBe(base);
    expect(
      presignParts({ ...input, now: new Date("2013-05-24T00:00:01Z") }).signature,
    ).not.toBe(base);
    expect(
      presignParts({
        ...input,
        credentials: { ...CREDENTIALS, bucket: "otro" },
      }).signature,
    ).not.toBe(base);
  });

  it("signs an extra header when one is required", () => {
    const withType = presignParts({
      ...input,
      method: "PUT",
      signedHeaders: { "Content-Type": "image/jpeg" },
    });
    expect(withType.canonicalRequest).toContain("content-type:image/jpeg");
    expect(withType.canonicalRequest).toContain("content-type;host");
    expect(withType.url).toContain("X-Amz-SignedHeaders=content-type%3Bhost");
  });
});

describe("presign", () => {
  const input = {
    credentials: CREDENTIALS,
    method: "GET" as const,
    key: "fotos/user-1/abc.jpg",
    expiresIn: 900,
    now: NOW,
  };

  it("returns a URL carrying the signature and no secret", () => {
    const url = new URL(presign(input));
    expect(url.origin).toBe("https://examplebucket.s3.amazonaws.com");
    expect(url.pathname).toBe("/mibebe/fotos/user-1/abc.jpg");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    // The access key id is public by design; the secret must never appear.
    expect(presign(input)).not.toContain(CREDENTIALS.secretAccessKey);
  });

  it("refuses a URL that would never expire", () => {
    // A presigned URL with no expiry is a public URL with extra steps, and
    // these point at somebody's bump photos.
    expect(() => presign({ ...input, expiresIn: 0 })).toThrow();
    expect(() => presign({ ...input, expiresIn: -1 })).toThrow();
    expect(() =>
      presign({ ...input, expiresIn: MAX_EXPIRES_IN + 1 }),
    ).toThrow();
    expect(() => presign({ ...input, expiresIn: MAX_EXPIRES_IN })).not.toThrow();
  });
});
