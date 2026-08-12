import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession, isAuthAvailable } from "@/lib/server/auth";
import { dbOrNull } from "@/lib/server/db";
import {
  acceptInvite,
  createInvite,
  ensurePregnancyForOwner,
  membersOf,
  membershipsOf,
  publishSnapshot,
  readSnapshotFor,
  revokeInviteCode,
  revokeMembership,
} from "@/lib/server/sharing";
import { isValidInviteCode } from "@/lib/sharing/fields";

// BUILD-PLAN E1 — family sharing.
//
// One route, four actions, because they share the same authorisation shape:
// everything needs a session, and everything that touches a pregnancy needs a
// live membership of it with the right role.
//
// The whole privacy argument lives in what this route CANNOT do: there is no
// action here that returns a record, a note, a photo or anything from
// `syncRecords`. A companion gets a `companionSnapshot` — week, due date, next
// appointment, baby name — and that is the entire surface.

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" } as const;

const ActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("invite"),
      // Only the owner can invite, and only to a non-owner role — there is no
      // path here to hand somebody else ownership.
      role: z.enum(["partner", "family"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("accept"),
      code: z.string().min(1).max(32),
    })
    .strict(),
  z
    .object({
      action: z.literal("revoke-member"),
      pregnancyId: z.string().min(1).max(64),
      userId: z.string().min(1).max(255),
    })
    .strict(),
  z
    .object({
      action: z.literal("revoke-invite"),
      pregnancyId: z.string().min(1).max(64),
      code: z.string().min(1).max(32),
    })
    .strict(),
  z
    .object({
      action: z.literal("publish"),
      // The owner's device pushing its snapshot. Every field is whitelisted
      // here as well as by the table, because this is the boundary a client
      // can actually post to.
      week: z.number().int().min(1).max(45).nullable(),
      dueDate: z.number().int().positive().nullable(),
      nextAppointmentAt: z.number().int().positive().nullable(),
      babyName: z.string().max(64).nullable(),
    })
    .strict(),
]);

function unavailable() {
  return NextResponse.json(
    { error: "no disponible" },
    { status: 404, headers: HEADERS },
  );
}

async function context() {
  if (!isAuthAvailable()) return { error: unavailable() } as const;
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "sesión requerida" },
        { status: 401, headers: HEADERS },
      ),
    } as const;
  }
  const database = dbOrNull();
  if (!database) return { error: unavailable() } as const;
  return { userId, database } as const;
}

/** What this user can currently see: their own pregnancy and any shared ones. */
export async function GET() {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;

  const memberships = await membershipsOf(ctx.database, ctx.userId);

  const views = await Promise.all(
    memberships.map(async (membership) => {
      const result = await readSnapshotFor(
        ctx.database,
        ctx.userId,
        membership.pregnancyId,
      );
      return {
        pregnancyId: membership.pregnancyId,
        role: membership.role,
        snapshot: result?.snapshot ?? null,
        // The owner also gets the guest list, so "quién ve mi embarazo" is
        // answerable. A companion does not: who else is in a family is not
        // theirs to know.
        members:
          membership.role === "owner"
            ? await membersOf(ctx.database, membership.pregnancyId)
            : undefined,
      };
    }),
  );

  return NextResponse.json({ views }, { headers: HEADERS });
}

export async function POST(req: NextRequest) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "cuerpo inválido" },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "pedido inválido" },
      { status: 400, headers: HEADERS },
    );
  }

  const now = Date.now();
  const data = parsed.data;

  if (data.action === "accept") {
    // Shape-check before touching the database: a malformed code is a typo,
    // not a lookup.
    if (!isValidInviteCode(data.code.toUpperCase())) {
      return NextResponse.json(
        { ok: false, reason: "not-found" },
        { status: 404, headers: HEADERS },
      );
    }
    const outcome = await acceptInvite(
      ctx.database,
      data.code.toUpperCase(),
      ctx.userId,
      now,
    );
    return NextResponse.json(outcome, {
      status: outcome.ok ? 200 : 404,
      headers: HEADERS,
    });
  }

  // Everything below acts on the caller's OWN pregnancy. It is resolved from
  // the session rather than taken from the body, so there is no id to tamper
  // with.
  const pregnancyId = await ensurePregnancyForOwner(
    ctx.database,
    ctx.userId,
    now,
  );

  if (data.action === "invite") {
    const invite = await createInvite(
      ctx.database,
      pregnancyId,
      ctx.userId,
      data.role,
      now,
    );
    return NextResponse.json(invite, { headers: HEADERS });
  }

  if (data.action === "publish") {
    await publishSnapshot(ctx.database, pregnancyId, {
      week: data.week,
      dueDate: data.dueDate,
      nextAppointmentAt: data.nextAppointmentAt,
      babyName: data.babyName?.trim() ? data.babyName.trim() : null,
      updatedAt: now,
    });
    return NextResponse.json({ ok: true }, { headers: HEADERS });
  }

  // Revocation. Both forms check that the pregnancy in the body is the
  // caller's own, so an owner cannot revoke somebody out of a pregnancy they
  // do not own.
  if (data.pregnancyId !== pregnancyId) {
    return NextResponse.json(
      { error: "no disponible" },
      { status: 404, headers: HEADERS },
    );
  }

  if (data.action === "revoke-member") {
    await revokeMembership(ctx.database, pregnancyId, data.userId);
  } else {
    await revokeInviteCode(ctx.database, pregnancyId, data.code.toUpperCase());
  }

  return NextResponse.json({ ok: true }, { headers: HEADERS });
}
