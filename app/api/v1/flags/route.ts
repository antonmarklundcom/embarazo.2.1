import { NextResponse, type NextRequest } from "next/server";

import {
  CHEAP_READ_LIMIT,
  clientKeyFromHeaders,
  isRateLimited,
} from "@/lib/rateLimit";
import { getClientFlags } from "@/lib/server/flags";

// BUILD-PLAN I5 / U1 — what the device is allowed to know about the flags.
//
// Two rules, both inherited rather than invented:
//
//   * **No parameters at all** (J3). This route takes nothing, and an unknown
//     parameter is a 400 rather than something ignored: a route that silently
//     drops `?week=24` teaches a client to keep sending it, and the app's
//     "No data collected" answer on the Play listing (`ANDROID-LAUNCH.md`
//     §3.1) is only true because no route accepts anything derived from a
//     pregnancy. There is nothing to filter by here anyway — the answer is the
//     same for every device on earth, which is what makes it cacheable.
//
//   * **Client-scope keys only.** `getClientFlags()` derives the subset from
//     each key's declared scope in `lib/flags/keys.ts`, so a server-scope flag
//     cannot reach a phone by someone forgetting a filter here.
//     `ai_baby_paused` says something about the founder's spending; it is not
//     the device's business.
//
// `public, max-age=60` matches the store's own cache window: a toggle is
// visible within about a minute everywhere, and until then a stale `false` is
// the safe direction (see `lib/server/flags.ts`).

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (
    isRateLimited(
      `flags:${clientKeyFromHeaders(req.headers)}`,
      Date.now(),
      CHEAP_READ_LIMIT,
    )
  ) {
    return NextResponse.json(
      { error: "demasiadas solicitudes" },
      { status: 429 },
    );
  }

  const params = req.nextUrl.searchParams;
  for (const key of params.keys()) {
    return NextResponse.json(
      { error: `parámetro no permitido: ${key}` },
      { status: 400 },
    );
  }

  return NextResponse.json(await getClientFlags(), {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
