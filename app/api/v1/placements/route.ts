import { NextResponse, type NextRequest } from "next/server";
import {
  CHEAP_READ_LIMIT,
  clientKeyFromHeaders,
  isRateLimited,
} from "@/lib/rateLimit";
import { getPlacements } from "@/lib/wordpress";

// BUILD-PLAN J3 — this route takes no parameters at all.
//
// It used to accept `trimester` and `department`. Trimester is derived from
// the user's due date, which makes it **health-derived**; department is a
// coarse location. Sending either turns an honest "No data collected" on the
// Play listing into a declaration of health and approximate-location
// collection (`docs/ANDROID-LAUNCH.md` §3.1), and a health app that declares
// collection gets a heavier review for no benefit.
//
// There are five placements. Filtering them on the device costs nothing and
// tells us nothing about anyone, so `components/LocalResourcesBlock.tsx` now
// does the trimester match (`matchesTrimester`, unit-tested) locally.

export async function GET(req: NextRequest) {
  // K14: Same as /directory: cheap to answer, and cheap to ask a thousand
  // times a second on a host with one process.
  if (isRateLimited(`placements:${clientKeyFromHeaders(req.headers)}`, Date.now(), CHEAP_READ_LIMIT)) {
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

  const all = await getPlacements();
  const sorted = [...all].sort((a, b) => b.priority - a.priority);

  return NextResponse.json(
    { placements: sorted },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
