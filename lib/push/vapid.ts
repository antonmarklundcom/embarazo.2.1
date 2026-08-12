import { createSign, createPrivateKey, type KeyObject } from "node:crypto";

// BUILD-PLAN B5 — VAPID request signing, without a dependency.
//
// **We send no payload.** A Web Push message with a body has to be encrypted
// (ECDH → HKDF → AES128GCM), which is genuinely not something to hand-roll and
// would mean adding `web-push`. A message with no body needs only a signed
// VAPID JWT, which is an ES256 signature over two base64url segments — a
// well-specified, boring thing that `node:crypto` does directly.
//
// That is not a shortcut, it is the design (docs/OPUS-REVIEW-2026-08.md §4.2):
// the server pokes the device and the SERVICE WORKER composes the sentence
// locally from IndexedDB. The server therefore never learns what the
// notification says, which week the user is in, or when their control actually
// is — only that some device asked to be poked at some time. Adding a payload
// later would mean adding both encryption and a reason to put health data in
// it, and we would rather not have either available.
//
// RFC 8292 (VAPID) · RFC 8030 (Web Push).

export interface VapidKeys {
  /** Base64url, uncompressed P-256 point (65 bytes starting 0x04). */
  publicKey: string;
  /** Base64url, PKCS#8 or raw 32-byte scalar. */
  privateKey: string;
  /** `mailto:` or `https:` contact, sent as the JWT `sub`. */
  subject: string;
}

export function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** The audience is the push service's origin, never the full endpoint. */
export function audienceFor(endpoint: string): string {
  return new URL(endpoint).origin;
}

/** Read the three env vars, or null when push is not configured. */
export function vapidFromEnv(env: {
  readonly [key: string]: string | undefined;
}): VapidKeys | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  const subject = env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  if (!/^(mailto:|https:)/.test(subject)) return null;
  return { publicKey, privateKey, subject };
}

/**
 * JWT expiry. RFC 8292 caps this at 24 h; 12 h leaves room for a slow clock
 * without a push service rejecting the token as too long-lived.
 */
export const VAPID_TTL_SECONDS = 12 * 60 * 60;

export function buildClaims(
  endpoint: string,
  subject: string,
  now: number,
): { aud: string; exp: number; sub: string } {
  return {
    aud: audienceFor(endpoint),
    exp: Math.floor(now / 1000) + VAPID_TTL_SECONDS,
    sub: subject,
  };
}

/**
 * Turn a base64url private key into a KeyObject.
 *
 * Accepts either a PKCS#8 DER (what `openssl`/`web-push` emit) or the bare
 * 32-byte scalar the VAPID spec talks about. The latter is wrapped in a
 * fixed PKCS#8 prefix for prime256v1 — a constant, not a computation.
 */
export function importPrivateKey(base64UrlKey: string): KeyObject {
  const raw = Buffer.from(base64UrlKey, "base64url");

  if (raw.length === 32) {
    const prefix = Buffer.from(
      "308141020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420",
      "hex",
    );
    return createPrivateKey({
      key: Buffer.concat([prefix, raw]),
      format: "der",
      type: "pkcs8",
    });
  }

  return createPrivateKey({ key: raw, format: "der", type: "pkcs8" });
}

/**
 * Sign the VAPID JWT (ES256).
 *
 * `dsaEncoding: "ieee-p1363"` is load-bearing: node signs ECDSA as DER by
 * default, and JWS requires the raw r||s pair. A DER signature here produces a
 * token every push service rejects, with an error that says nothing useful.
 */
export function signVapidJwt(
  endpoint: string,
  keys: VapidKeys,
  now: number = Date.now(),
): string {
  const header = base64UrlEncode(
    JSON.stringify({ typ: "JWT", alg: "ES256" }),
  );
  const payload = base64UrlEncode(
    JSON.stringify(buildClaims(endpoint, keys.subject, now)),
  );
  const signingInput = `${header}.${payload}`;

  const signer = createSign("SHA256");
  signer.update(signingInput);
  const signature = signer.sign({
    key: importPrivateKey(keys.privateKey),
    dsaEncoding: "ieee-p1363",
  });

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

/** The headers for a bodyless Web Push request. */
export function vapidHeaders(
  endpoint: string,
  keys: VapidKeys,
  options: { ttlSeconds?: number; urgency?: "very-low" | "low" | "normal" | "high" } = {},
  now: number = Date.now(),
): Record<string, string> {
  return {
    Authorization: `vapid t=${signVapidJwt(endpoint, keys, now)}, k=${keys.publicKey}`,
    // No body, so no Content-Encoding and no Content-Length. Push services
    // require TTL on every request.
    TTL: String(options.ttlSeconds ?? 6 * 60 * 60),
    Urgency: options.urgency ?? "normal",
  };
}
