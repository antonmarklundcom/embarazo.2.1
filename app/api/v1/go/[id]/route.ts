import { NextResponse, type NextRequest } from "next/server";
import { getDirectory, getPlacements } from "@/lib/wordpress";
import { waLink, defaultPrefill } from "@/lib/whatsapp";
import { isRateLimited, clientKeyFromHeaders } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// BUILD-PLAN J3 — attribution is the listing id, and nothing else.
//
// This route used to accept `trimester`, `department` and `week`, and forward
// the first two to `SHEETS_WEBHOOK_URL`. Trimester and week are derived from
// the due date (health data); department is a coarse location. Together they
// were enough to turn "No data collected" on the Play listing into a
// declaration of health-plus-location collection — for a click counter
// (`docs/ANDROID-LAUNCH.md` §3.1).
//
// What the founder actually needs from this is "how many people tapped
// WhatsApp on this listing", and the id alone answers that. A sponsor asking
// for click-through by department can be answered from the directory itself
// (each listing already has one), without the *user's* department ever
// travelling.
//
// **`week` is gone from the WhatsApp pre-fill too**, and that is a real,
// deliberate product cost: the business now receives "Vi su información en Mi
// Bebé" instead of "…(semana 24)". Keeping it would have meant transmitting
// the user's gestational week — the single most health-derived value the app
// holds — to our server on every tap, to save the business one question.

const ALLOWED_PARAMS = new Set<string>();

function fireAttribution(id: string) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) return;
  // Fire-and-forget: do not await, swallow failures. The body is the id and a
  // timestamp — there is nothing else here to send.
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ts: Date.now() }),
    keepalive: true,
  }).catch(() => {});
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Reject rather than ignore: a stale cached client still appending
  // `?department=` must fail loudly, not have it quietly dropped while the
  // store listing claims nothing is collected.
  for (const key of req.nextUrl.searchParams.keys()) {
    if (!ALLOWED_PARAMS.has(key)) {
      return NextResponse.json(
        { error: `parámetro no permitido: ${key}` },
        { status: 400 },
      );
    }
  }

  const clientKey = clientKeyFromHeaders(req.headers);
  if (isRateLimited(clientKey)) {
    return NextResponse.json({ error: "demasiadas solicitudes" }, { status: 429 });
  }

  const [placements, directory] = await Promise.all([
    getPlacements(),
    getDirectory(),
  ]);

  const placement = placements.find((p) => p.id === id);
  const listing = directory.find((l) => l.id === id);
  const target = placement ?? listing;

  if (!target) {
    return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  }

  fireAttribution(id);

  const destination = waLink(target.whatsappNumber, defaultPrefill());
  return NextResponse.redirect(destination, 302);
}
