import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPlacements } from "@/lib/wordpress";
import { isValidDepartment } from "@/lib/departments";

// Privacy boundary (build spec §7): only `trimester` and `department` are
// accepted. Any other param → 400. No cookies, no Set-Cookie.
const QuerySchema = z
  .object({
    trimester: z
      .enum(["1", "2", "3"])
      .transform((v) => Number(v) as 1 | 2 | 3)
      .optional(),
    department: z
      .string()
      .refine(isValidDepartment, "departamento inválido")
      .optional(),
  })
  .strict();

const ALLOWED = new Set(["trimester", "department"]);

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
    trimester: params.get("trimester") ?? undefined,
    department: params.get("department") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "parámetros inválidos" }, { status: 400 });
  }

  const { trimester } = parsed.data;
  const all = await getPlacements();

  const filtered = all
    .filter((p) => p.trimester === 0 || trimester === undefined || p.trimester === trimester)
    .sort((a, b) => b.priority - a.priority);

  return NextResponse.json(
    { placements: filtered },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
