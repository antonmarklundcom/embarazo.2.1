import { NextResponse } from "next/server";

import { getRevision } from "@/lib/server/revision";

export const dynamic = "force-dynamic";

// A liveness probe that also names the deployed source revision (first seven
// characters of the git SHA, or "unknown") so a deploy can be verified by
// revision. The value is computed once per process from the checkout's `.git`
// files or CI env vars — see `lib/server/revision.ts`. No database, no request
// data, nothing else in the body.
export function GET() {
  return NextResponse.json({ ok: true, revision: getRevision() });
}
