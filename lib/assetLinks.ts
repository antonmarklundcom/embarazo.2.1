export type AssetLinkStatement = {
  relation: string[];
  target: { namespace: "android_app"; package_name: string; sha256_cert_fingerprints: string[] };
};

// A SHA-256 certificate fingerprint as Play Console shows it: 32 hex bytes, colon-separated.
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const PACKAGE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

/** The assetlinks.json body for the configured TWA, or [] when not configured. */
export function assetLinks(env: Readonly<Record<string, string | undefined>>): AssetLinkStatement[] {
  const pkg = env.TWA_PACKAGE_NAME?.trim() ?? "";
  const fingerprints = (env.TWA_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter((f) => FINGERPRINT.test(f));
  if (!PACKAGE.test(pkg) || fingerprints.length === 0) return [];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: pkg,
        sha256_cert_fingerprints: [...new Set(fingerprints)],
      },
    },
  ];
}
