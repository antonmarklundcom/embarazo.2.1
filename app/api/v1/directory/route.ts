import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDirectory } from "@/lib/wordpress";
import { isValidDepartment } from "@/lib/departments";

// Privacy boundary (build spec §7): whitelist department, category, q only.
const QuerySchema = z
  .object({
    department: z
      .string()
      .refine(isValidDepartment, "departamento inválido")
      .optional(),
    category: z.enum(["sanatorio", "obstetra", "ecografia", "cordon"]).optional(),
    q: z.string().max(80).optional(),
  })
  .strict();

const ALLOWED = new Set(["department", "category", "q"]);

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  for (const key of params.keys()) {
    if (!ALLOWED.has(key)) {
      return NextResponse.json(
        { error: `parámetro no permitido: ${key}` },
        { status: 400 },
      );
    }
  }

  const parsed = QuerySchema.safeParse({
    department: params.get("department") ?? undefined,
    category: params.get("category") ?? undefined,
    q: params.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "parámetros inválidos" }, { status: 400 });
  }

  const { department, category, q } = parsed.data;
  let listings = await getDirectory();

  if (department) listings = listings.filter((l) => l.department === department);
  if (category) listings = listings.filter((l) => l.category === category);
  if (q) {
    const needle = q.toLowerCase();
    listings = listings.filter(
      (l) =>
        l.name.toLowerCase().includes(needle) ||
        l.city.toLowerCase().includes(needle),
    );
  }

  // Sponsored pinned on top, then by priority (build spec §6).
  listings = [...listings].sort((a, b) => {
    if (a.isSponsored !== b.isSponsored) return a.isSponsored ? -1 : 1;
    return b.priority - a.priority;
  });

  return NextResponse.json(
    { listings },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
