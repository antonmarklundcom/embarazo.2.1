import { NextResponse } from "next/server";

import { getRevision } from "@/lib/server/revision";

export const dynamic = "force-dynamic";

// A liveness probe that also names the deployed source revision (first seven
// characters of the git SHA, or "unknown") so a deploy can be verified by
// revision. The value is baked in at build time (git, then CI env vars; see
// `lib/server/buildRevision.ts` and `next.config.ts`), with the runtime `.git`
// read in `lib/server/revision.ts` as a fallback. No database, no request data,
// nothing else in the body.
export function GET() {
  return NextResponse.json({ ok: true, revision: getRevision() });
}
