import { describe, expect, it } from "vitest";
import { isAllowedPushEndpoint } from "./endpoints";

// K14 — `/api/v1/push` takes an endpoint URL from an anonymous caller and our
// own server fetches it later, on a schedule. That is a persistent SSRF unless
// the host is whitelisted, so these are the cases the whitelist exists for.

describe("real push services are accepted", () => {
  it("takes the endpoints browsers actually produce", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/abcDEF123:APA91b...",
      "https://android.googleapis.com/gcm/send/abc123",
      "https://updates.push.services.mozilla.com/wpush/v2/gAAAAA",
      "https://db5p.notify.windows.com/w/?token=BQYAAAB",
      "https://web.push.apple.com/QAbcdef1234",
    ]) {
      expect(isAllowedPushEndpoint(endpoint), endpoint).toBe(true);
    }
  });
});

describe("everything else is refused", () => {
  it("refuses the addresses an SSRF is actually aimed at", () => {
    for (const endpoint of [
      // Cloud metadata: the classic, and the reason this file exists.
      "https://169.254.169.254/latest/meta-data/iam/security-credentials/",
      "https://metadata.google.internal/computeMetadata/v1/",
      // Anything on our own host or network.
      "https://localhost/api/v1/admin",
      "https://127.0.0.1/api/v1/sync",
      "https://10.0.0.5/",
      "https://[::1]/",
      // Somebody else's server, waiting to be poked on a schedule.
      "https://attacker.example.com/collect",
    ]) {
      expect(isAllowedPushEndpoint(endpoint), endpoint).toBe(false);
    }
  });

  it("refuses a host that merely ends with a trusted name", () => {
    // The failure mode of every suffix-matched whitelist ever written.
    for (const endpoint of [
      "https://fcm.googleapis.com.attacker.example/send",
      "https://evilfcm.googleapis.com/send",
      "https://notify.windows.com.evil.test/w/",
      "https://xnotify.windows.com/w/",
    ]) {
      expect(isAllowedPushEndpoint(endpoint), endpoint).toBe(false);
    }
  });

  it("refuses plaintext, credentials and ports", () => {
    // http: an endpoint is a bearer capability in a URL. Credentials and a
    // port both change who the request is really to.
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://user:pw@fcm.googleapis.com/fcm/send/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com:8080/fcm/send/x")).toBe(false);
  });

  it("refuses things that are not URLs at all", () => {
    for (const endpoint of ["", "not a url", "javascript:alert(1)", "file:///etc/passwd"]) {
      expect(isAllowedPushEndpoint(endpoint), endpoint).toBe(false);
    }
  });

  it("is case-insensitive about the host, as DNS is", () => {
    expect(isAllowedPushEndpoint("https://FCM.GoogleAPIs.COM/fcm/send/x")).toBe(true);
  });
});
