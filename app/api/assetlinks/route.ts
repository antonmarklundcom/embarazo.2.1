// Digital Asset Links for the Google Play TWA (docs/ANDROID-LAUNCH.md §2.3),
// served at /.well-known/assetlinks.json through the rewrite in next.config.ts.
//
// Read from env at request time so the Play signing fingerprint — known only
// after the first upload to Play Console — goes live with an env change and a
// restart, not a code release:
//   TWA_PACKAGE_NAME=py.com.embarazo.app
//   TWA_SHA256_FINGERPRINTS=<upload key SHA-256>,<Play app signing key SHA-256>
// List BOTH keys, or the released app opens with a browser URL bar.
// Unset → an empty statement list, which verifies nothing and breaks nothing.

import { assetLinks } from "@/lib/assetLinks";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(assetLinks(process.env), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
