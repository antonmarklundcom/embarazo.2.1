import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDirectory, getPlacements } from "@/lib/wordpress";
import { isValidDepartment } from "@/lib/departments";
import { waLink, defaultPrefill } from "@/lib/whatsapp";
import { isRateLimited, clientKeyFromHeaders } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Optional, fire-and-forget click attribution (build spec §7). Never blocks the
// redirect, logs nothing identifying, and is skipped entirely if unset.
const AttrSchema = z.object({
  trimester: z.coerce.number().int().min(1).max(3).optional(),
  department: z.string().refine(isValidDepartment).optional(),
});

function fireAttribution(
  id: string,
  trimester: number | undefined,
  department: string | undefined,
) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) return;
  // Fire-and-forget: do not await, swallow failures.
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, trimester, department, ts: Date.now() }),
    keepalive: true,
  }).catch(() => {});
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  const sp = req.nextUrl.searchParams;
  const attr = AttrSchema.safeParse({
    trimester: sp.get("trimester") ?? undefined,
    department: sp.get("department") ?? undefined,
  });
  if (attr.success) {
    fireAttribution(id, attr.data.trimester, attr.data.department);
  }

  const week = Number(sp.get("week")) || undefined;
  const message = defaultPrefill(week);
  const destination = waLink(target.whatsappNumber, message);

  return NextResponse.redirect(destination, 302);
}
