import { NextResponse } from "next/server";
import { enabledProviderIds, isAuthEnabled } from "@/lib/authConfig";

// BUILD-PLAN A2. Tells the client whether accounts exist in this deployment.
//
// Why a route rather than a NEXT_PUBLIC_ env var: the answer depends on server
// secrets (DATABASE_URL, AUTH_SECRET, provider credentials) that must never be
// mirrored into a public variable, and a mirrored copy would silently drift out
// of sync with the real configuration. This returns only booleans and provider
// ids — nothing personal, no session required.
export function GET() {
  return NextResponse.json(
    {
      enabled: isAuthEnabled(process.env),
      providers: enabledProviderIds(process.env),
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
