import { NextResponse, type NextRequest } from "next/server";
import { getDirectory } from "@/lib/wordpress";

// BUILD-PLAN J3 — this route takes no parameters at all.
//
// It used to accept `department`, `category` and `q`. `department` is a coarse
// location, which Play's Data safety form calls "Approximate location" — and
// declaring it costs the app an honest **"No data collected"** badge on the
// store listing, which for a pregnancy app is a real asset
// (`docs/ANDROID-LAUNCH.md` §3.1). The directory is a few dozen entries and is
// already precached by the service worker, so there was never a reason to
// filter it on a server: the client now does it, and nothing about where the
// user is is transmitted.
//
// `category` and `q` went with it. Neither is location- or health-derived, but
// keeping them would mean keeping a query surface, a whitelist and a reason to
// argue about the next parameter someone wants to add. A route that accepts
// nothing cannot leak anything, and it caches under one key.
//
// D5 ("server-side filtering and pagination when listings pass ~100") is the
// documented point at which to revisit this. Until then, sending the list is
// both cheaper and quieter.

export async function GET(req: NextRequest) {
  // Not "ignore unexpected params" — reject them. Silently accepting a
  // `?department=` would let an old cached client keep transmitting it while
  // the store listing says nothing is collected.
  const params = req.nextUrl.searchParams;
  for (const key of params.keys()) {
    return NextResponse.json(
      { error: `parámetro no permitido: ${key}` },
      { status: 400 },
    );
  }

  const listings = await getDirectory();

  // Sponsored pinned on top, then by priority (build spec §6). Sorting here
  // rather than on the client keeps the order a property of the data.
  const sorted = [...listings].sort((a, b) => {
    if (a.isSponsored !== b.isSponsored) return a.isSponsored ? -1 : 1;
    return b.priority - a.priority;
  });

  return NextResponse.json(
    { listings: sorted },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
