import { createHash, createHmac } from "node:crypto";

// BUILD-PLAN K4 — AWS Signature V4, query-string presigning.
//
// **Why this is here rather than `@aws-sdk/client-s3`.** B5 made the same call
// for Web Push and the reasoning transfers exactly: the SDK exists to do a
// great deal we do not need (credential chains, retries, streaming, a hundred
// operations), it is megabytes of dependency on a Hostinger box, and what K4
// actually needs is two signed URLs and a DELETE. SigV4 is a documented
// algorithm with published test vectors, so it can be verified rather than
// trusted — `sigv4.test.ts` runs AWS's own `get-vanilla` vector through it.
//
// It is deliberately **provider-agnostic**: every S3-compatible service
// (Hostinger, Backblaze B2, Cloudflare R2, MinIO, S3 itself) speaks this, so
// the decision of where the bytes live stays an environment variable rather
// than a rewrite. See DECISIONS.md K4 for why that mattered more than the
// convenience of an SDK.
//
// Nothing here reads `process.env` or touches the network. It is a pure
// function from (credentials, request) to a URL, which is what makes it
// testable and what keeps the secret confined to its one call site.

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  /** e.g. "https://s3.eu-central-1.example.com" — no bucket, no trailing slash. */
  endpoint: string;
  bucket: string;
}

export interface PresignInput {
  credentials: S3Credentials;
  method: "GET" | "PUT" | "DELETE";
  /** Object key, WITHOUT a leading slash. */
  key: string;
  /** Seconds the URL stays valid. */
  expiresIn: number;
  now: Date;
  /** Extra headers that must be signed (e.g. content-type on a PUT). */
  signedHeaders?: Record<string, string>;
}

const SERVICE = "s3";
const ALGORITHM = "AWS4-HMAC-SHA256";
/** A presigned URL that never expires is a public URL with extra steps. */
export const MAX_EXPIRES_IN = 60 * 60;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

/**
 * RFC 3986 encoding.
 *
 * `encodeURIComponent` leaves `!'()*` alone and AWS does not, which produces a
 * signature mismatch on exactly the keys nobody tests with.
 */
export function uriEncode(value: string, encodeSlash = true): string {
  let out = "";
  for (const char of value) {
    if (/[A-Za-z0-9\-._~]/.test(char)) {
      out += char;
    } else if (char === "/") {
      out += encodeSlash ? "%2F" : "/";
    } else {
      for (const byte of new TextEncoder().encode(char)) {
        out += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
      }
    }
  }
  return out;
}

export function amzDate(now: Date): { amz: string; date: string } {
  const amz = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { amz, date: amz.slice(0, 8) };
}

function signingKey(
  secretAccessKey: string,
  date: string,
  region: string,
): Buffer {
  const kDate = hmac(`AWS4${secretAccessKey}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

/**
 * A presigned URL for one object.
 *
 * Path-style addressing (`/bucket/key`) rather than virtual-host style: it is
 * what every self-hosted S3-compatible endpoint supports, and AWS still
 * accepts it. Choosing the portable form here is what makes the storage
 * provider an env var.
 */
export interface PresignParts {
  canonicalRequest: string;
  stringToSign: string;
  signature: string;
  url: string;
}

export function presign(input: PresignInput): string {
  return presignParts(input).url;
}

/**
 * The same computation, with its intermediate strings.
 *
 * Exported so the test can check the *canonical request* and the *string to
 * sign* against AWS's published vectors rather than only the final signature.
 * A wrong signature tells you nothing about where it went wrong; these two
 * strings tell you exactly.
 */
export function presignParts(input: PresignInput): PresignParts {
  const { credentials, method, key, expiresIn, now } = input;
  if (expiresIn <= 0 || expiresIn > MAX_EXPIRES_IN) {
    throw new Error(`expiresIn must be between 1 and ${MAX_EXPIRES_IN} seconds`);
  }

  const url = new URL(credentials.endpoint);
  const { amz, date } = amzDate(now);
  const scope = `${date}/${credentials.region}/${SERVICE}/aws4_request`;

  const canonicalUri = `/${uriEncode(credentials.bucket, false)}/${uriEncode(
    key,
    false,
  )}`;

  const headers: Record<string, string> = {
    host: url.host,
    ...Object.fromEntries(
      Object.entries(input.signedHeaders ?? {}).map(([name, value]) => [
        name.toLowerCase(),
        value.trim(),
      ]),
    ),
  };
  const headerNames = Object.keys(headers).sort();
  const canonicalHeaders =
    headerNames.map((name) => `${name}:${headers[name]}\n`).join("");
  const signedHeaderList = headerNames.join(";");

  const query: Record<string, string> = {
    "X-Amz-Algorithm": ALGORITHM,
    "X-Amz-Credential": `${credentials.accessKeyId}/${scope}`,
    "X-Amz-Date": amz,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaderList,
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((name) => `${uriEncode(name)}=${uriEncode(query[name]!)}`)
    .join("&");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaderList,
    // Presigned URLs sign the payload as UNSIGNED-PAYLOAD: the body is
    // uploaded by the browser later and its hash cannot be known here.
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    ALGORITHM,
    amz,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signature = hmac(
    signingKey(credentials.secretAccessKey, date, credentials.region),
    stringToSign,
  ).toString("hex");

  return {
    canonicalRequest,
    stringToSign,
    signature,
    url: `${url.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`,
  };
}
