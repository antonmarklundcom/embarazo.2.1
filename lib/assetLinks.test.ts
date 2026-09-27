import { describe, expect, it } from "vitest";
import { assetLinks } from "./assetLinks";

const A = Array.from({ length: 32 }, () => "AB").join(":");
const B = Array.from({ length: 32 }, () => "0c").join(":");

describe("assetLinks", () => {
  it("is empty until the package and a fingerprint are configured", () => {
    expect(assetLinks({})).toEqual([]);
    expect(assetLinks({ TWA_PACKAGE_NAME: "py.com.embarazo.app" })).toEqual([]);
    expect(assetLinks({ TWA_SHA256_FINGERPRINTS: A })).toEqual([]);
  });

  it("lists both keys, uppercased and de-duplicated", () => {
    const [statement] = assetLinks({
      TWA_PACKAGE_NAME: " py.com.embarazo.app ",
      TWA_SHA256_FINGERPRINTS: `${A}, ${B},${A}`,
    });
    expect(statement!.relation).toEqual(["delegate_permission/common.handle_all_urls"]);
    expect(statement!.target).toEqual({
      namespace: "android_app",
      package_name: "py.com.embarazo.app",
      sha256_cert_fingerprints: [A, B.toUpperCase()],
    });
  });

  it("drops malformed fingerprints and package names", () => {
    expect(assetLinks({ TWA_PACKAGE_NAME: "nodots", TWA_SHA256_FINGERPRINTS: A })).toEqual([]);
    expect(
      assetLinks({ TWA_PACKAGE_NAME: "py.com.embarazo.app", TWA_SHA256_FINGERPRINTS: "AB:CD" }),
    ).toEqual([]);
  });
});
