import { describe, expect, it } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";

import {
  audienceFor,
  base64UrlEncode,
  buildClaims,
  signVapidJwt,
  vapidFromEnv,
  vapidHeaders,
  VAPID_TTL_SECONDS,
} from "./vapid";

// BUILD-PLAN B5. The signature is the part that either works or fails with an
// error no push service explains, so it is verified here against node's own
// verifier rather than eyeballed.

function testKeys() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  return {
    publicKey: base64UrlEncode(
      publicKey.export({ format: "der", type: "spki" }),
    ),
    privateKey: Buffer.from(
      privateKey.export({ format: "der", type: "pkcs8" }),
    ).toString("base64url"),
    subject: "mailto:hola@mibebe.app",
    verifier: publicKey,
  };
}

describe("audience", () => {
  it("is the push service origin, never the endpoint itself", () => {
    // The endpoint identifies a device. Sending it as the JWT audience would
    // hand it to anyone who could read the token.
    expect(
      audienceFor("https://fcm.googleapis.com/fcm/send/abc123?x=1"),
    ).toBe("https://fcm.googleapis.com");
  });
});

describe("claims", () => {
  it("expires within the RFC 8292 24-hour cap", () => {
    const now = 1_700_000_000_000;
    const claims = buildClaims("https://push.example.com/x", "mailto:a@b.c", now);
    expect(claims.exp).toBe(Math.floor(now / 1000) + VAPID_TTL_SECONDS);
    expect(claims.exp - Math.floor(now / 1000)).toBeLessThanOrEqual(24 * 3600);
  });
});

describe("signVapidJwt", () => {
  it("produces a token node can verify with the matching public key", () => {
    const keys = testKeys();
    const token = signVapidJwt("https://push.example.com/x", keys);
    const [header, payload, signature] = token.split(".");

    const verifier = createVerify("SHA256");
    verifier.update(`${header}.${payload}`);
    const ok = verifier.verify(
      { key: keys.verifier, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature!, "base64url"),
    );
    expect(ok).toBe(true);
  });

  it("signs as raw r||s, not DER", () => {
    // ES256 in JWS is a 64-byte r||s pair. A DER signature is accepted by
    // nothing and rejected with an unhelpful message, so assert the length.
    const keys = testKeys();
    const token = signVapidJwt("https://push.example.com/x", keys);
    const signature = Buffer.from(token.split(".")[2]!, "base64url");
    expect(signature).toHaveLength(64);
  });

  it("declares ES256 in the header", () => {
    const keys = testKeys();
    const token = signVapidJwt("https://push.example.com/x", keys);
    const header = JSON.parse(
      Buffer.from(token.split(".")[0]!, "base64url").toString("utf8"),
    );
    expect(header).toEqual({ typ: "JWT", alg: "ES256" });
  });

  it("emits base64url with no padding", () => {
    const keys = testKeys();
    const token = signVapidJwt("https://push.example.com/x", keys);
    expect(token).not.toContain("=");
    expect(token).not.toContain("+");
    expect(token).not.toContain("/");
  });
});

describe("vapidHeaders", () => {
  it("sends no Content-Encoding, because it sends no body", () => {
    // The whole privacy argument rests on there being no payload: the server
    // pokes, the service worker composes. A body would need encryption and
    // would invite putting health data in it.
    const headers = vapidHeaders("https://push.example.com/x", testKeys());
    expect(headers["Content-Encoding"]).toBeUndefined();
    expect(headers["Content-Length"]).toBeUndefined();
    expect(headers.TTL).toBeDefined();
    expect(headers.Authorization).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=/);
  });
});

describe("vapidFromEnv", () => {
  const full = {
    VAPID_PUBLIC_KEY: "pub",
    VAPID_PRIVATE_KEY: "priv",
    VAPID_SUBJECT: "mailto:hola@mibebe.app",
  };

  it("returns null when push is not configured", () => {
    // Unconfigured is a supported deployment, not an error — same rule as
    // DATABASE_URL and AUTH_SECRET.
    expect(vapidFromEnv({})).toBeNull();
    expect(vapidFromEnv({ ...full, VAPID_PRIVATE_KEY: undefined })).toBeNull();
    expect(vapidFromEnv({ ...full, VAPID_PUBLIC_KEY: "   " })).toBeNull();
  });

  it("rejects a subject that is not mailto: or https:", () => {
    // Push services reject these, and doing it here makes the misconfiguration
    // visible at the boundary rather than as a 400 from FCM.
    expect(vapidFromEnv({ ...full, VAPID_SUBJECT: "hola@mibebe.app" })).toBeNull();
  });

  it("accepts a complete configuration", () => {
    expect(vapidFromEnv(full)?.subject).toBe("mailto:hola@mibebe.app");
  });
});
