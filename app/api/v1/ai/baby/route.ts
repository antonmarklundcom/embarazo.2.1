import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession, isAuthAvailable } from "@/lib/server/auth";
import { dbOrNull } from "@/lib/server/db";
import { generateBabyImage, isConfigured } from "@/lib/server/aiBaby";
import { clientKeyFromHeaders, isRateLimited } from "@/lib/rateLimit";
import {
  ACCEPTED_MIME,
  FAILURE_MESSAGE,
  PHOTO_PROBLEM_MESSAGE,
  validatePhotos,
} from "@/lib/ai/babyImage";

// BUILD-PLAN F1 — POST /api/v1/ai/baby.
//
// Requires a session, because this costs real money per call and an anonymous
// endpoint that spends money is a bill waiting to happen. Requires an explicit
// consent field, because ARCHITECTURE.md §10 asks for a consent step that names
// what is sent — and a step the server does not check is decoration.
//
// The response carries the generated image inline. It is not stored: whether
// to keep it is the device's decision, and if the user closes the screen it is
// gone from everywhere.

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" } as const;

const RequestSchema = z
  .object({
    // A literal, like A2's consent gate: the only value that satisfies this is
    // a deliberate tick, and an absent field cannot pass.
    consent: z.literal("acepto"),
    photos: z
      .array(
        z
          .object({
            mimeType: z.enum(ACCEPTED_MIME),
            data: z.string().min(1),
          })
          .strict(),
      )
      .min(1)
      .max(2),
  })
  .strict();

function unavailable() {
  return NextResponse.json(
    { error: FAILURE_MESSAGE.disabled },
    { status: 404, headers: HEADERS },
  );
}

export async function POST(req: NextRequest) {
  // The kill switch, first. With AI_BABY_ENABLED unset the route does not
  // exist — no 403, no "próximamente", nothing to probe.
  if (!isConfigured() || !isAuthAvailable()) return unavailable();

  const database = dbOrNull();
  if (!database) return unavailable();

  if (isRateLimited(`ai:${clientKeyFromHeaders(req.headers)}`)) {
    return NextResponse.json(
      { error: "Probá de nuevo en un minuto." },
      { status: 429, headers: HEADERS },
    );
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "sesión requerida" },
      { status: 401, headers: HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "cuerpo inválido" },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: FAILURE_MESSAGE.invalid },
      { status: 400, headers: HEADERS },
    );
  }

  // Size is checked here rather than only in zod so the message can name the
  // actual problem ("la foto es muy pesada") instead of "inválido".
  const problem = validatePhotos(parsed.data.photos);
  if (problem) {
    return NextResponse.json(
      { error: PHOTO_PROBLEM_MESSAGE[problem] },
      { status: 400, headers: HEADERS },
    );
  }

  const result = await generateBabyImage(database, userId, parsed.data.photos);

  if (!result.ok) {
    return NextResponse.json(
      { error: FAILURE_MESSAGE[result.failure] },
      { status: result.failure === "disabled" ? 404 : 502, headers: HEADERS },
    );
  }

  // The photos go out of scope here and are never written anywhere.
  return NextResponse.json({ image: result.image }, { headers: HEADERS });
}
