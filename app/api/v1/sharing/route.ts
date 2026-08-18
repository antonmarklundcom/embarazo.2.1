import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession, isAuthAvailable } from "@/lib/server/auth";
import { dbOrNull } from "@/lib/server/db";
import {
  acceptInvite,
  assignTask,
  createInvite,
  ensurePregnancyForOwner,
  markCheersSeen,
  membersOf,
  membershipsOf,
  publishSnapshot,
  readCheersFor,
  readSnapshotFor,
  readTasksFor,
  revokeInviteCode,
  liveMembership,
  revokeMembership,
  sendCheer,
  setTaskDone,
  unassignTask,
} from "@/lib/server/sharing";
import {
  canCompleteSharedTask,
  isValidInviteCode,
  SHARED_TASK_KEYS,
} from "@/lib/sharing/fields";
import { CHEER_IDS } from "@/lib/sharing/cheers";
import { SHARING_DEFAULTS, emptyExtras } from "@/lib/sharing/levels";

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

// zod needs a non-empty tuple of literals; both lists are pinned in code and
// are never empty, and casting here rather than hand-copying them is what keeps
// the route's whitelist and the app's own vocabularies from drifting apart.
const TASK_KEYS = SHARED_TASK_KEYS as unknown as [string, ...string[]];
const CHEER_ID_VALUES = CHEER_IDS as unknown as [string, ...string[]];

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
  // K2 — shared checklist items. `itemKey` is a z.enum over the app's own
  // checklist keys, so the server can only ever store an id it already knows:
  // no label, no note, no prose an owner types. Same discipline as the
  // snapshot's shape whitelist, applied to a second table.
  z
    .object({
      action: z.literal("assign-task"),
      itemKey: z.enum(TASK_KEYS),
    })
    .strict(),
  z
    .object({
      action: z.literal("unassign-task"),
      itemKey: z.enum(TASK_KEYS),
    })
    .strict(),
  z
    .object({
      action: z.literal("complete-task"),
      pregnancyId: z.string().min(1).max(64),
      itemKey: z.enum(TASK_KEYS),
      done: z.boolean(),
    })
    .strict(),
  // K2 — "mandale ánimo". The whole message is an id from CHEERS; there is no
  // text field here, deliberately (see lib/sharing/cheers.ts).
  z
    .object({
      action: z.literal("cheer"),
      pregnancyId: z.string().min(1).max(64),
      cheerId: z.enum(CHEER_ID_VALUES),
    })
    .strict(),
  z.object({ action: z.literal("cheers-seen") }).strict(),
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
      // K3 — the owner's per-field sharing levels and the values they unlock.
      // Absent means off / nothing, so a client that predates K3 publishes
      // exactly what it always did and shares nothing new.
      sharing: z
        .object({
          peso: z.boolean(),
          pataditas: z.boolean(),
          fotos: z.boolean(),
        })
        .strict()
        .optional(),
      // Bounds, not just types: a weight is a person's weight and a kick count
      // is a count. 20–300 kg in grams, and a session nobody could have sat
      // through. Out-of-range is a 400 rather than a stored absurdity.
      extras: z
        .object({
          weightGrams: z.number().int().min(20_000).max(300_000).nullable(),
          weightAt: z.number().int().positive().nullable(),
          kickCount: z.number().int().min(0).max(1000).nullable(),
          kickAt: z.number().int().positive().nullable(),
        })
        .strict()
        .optional(),
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
        // K3. Null for everyone but the pareja, and null per field for every
        // level the owner has not turned on. `readSnapshotFor` decides both —
        // this route never sees an unfiltered row.
        extras: result?.extras ?? undefined,
        // The owner also gets the guest list, so "quién ve mi embarazo" is
        // answerable. A companion does not: who else is in a family is not
        // theirs to know.
        members:
          membership.role === "owner"
            ? await membersOf(ctx.database, membership.pregnancyId)
            : undefined,
        // K2. `readTasksFor` returns null — not [] — for a `family` member:
        // "there is nothing assigned" is itself an answer, and family is not
        // entitled to it. The owner sees her own list so she can manage it.
        tasks:
          (await readTasksFor(
            ctx.database,
            ctx.userId,
            membership.pregnancyId,
          )) ?? undefined,
        // Cheers are the owner's own inbox; a companion never sees who else
        // has been cheering.
        cheers:
          membership.role === "owner"
            ? ((await readCheersFor(
                ctx.database,
                ctx.userId,
                membership.pregnancyId,
              )) ?? undefined)
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

  // K2 — the two actions a COMPANION performs, on somebody else's pregnancy.
  // They are handled before `ensurePregnancyForOwner` on purpose: that call
  // creates a pregnancy for the caller, and a partner ticking off "llevá el
  // carné" must not silently acquire a pregnancy of their own. The pregnancy id
  // does come from the body here — there is no other way to name a pregnancy
  // you do not own — and it is authorised by a live-membership lookup inside
  // each function, which is also what makes a revoked companion's next tap fail
  // instantly rather than eventually.
  if (data.action === "complete-task") {
    const membership = await liveMembership(
      ctx.database,
      ctx.userId,
      data.pregnancyId,
    );
    if (!membership || !canCompleteSharedTask(membership.role)) {
      return NextResponse.json(
        { error: "no disponible" },
        { status: 404, headers: HEADERS },
      );
    }
    await setTaskDone(
      ctx.database,
      data.pregnancyId,
      data.itemKey,
      data.done,
      now,
    );
    return NextResponse.json({ ok: true }, { headers: HEADERS });
  }

  if (data.action === "cheer") {
    const sent = await sendCheer(
      ctx.database,
      ctx.userId,
      data.pregnancyId,
      data.cheerId,
      now,
    );
    if (!sent) {
      return NextResponse.json(
        { error: "no disponible" },
        { status: 404, headers: HEADERS },
      );
    }
    return NextResponse.json({ ok: true }, { headers: HEADERS });
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
    await publishSnapshot(
      ctx.database,
      pregnancyId,
      {
        week: data.week,
        dueDate: data.dueDate,
        nextAppointmentAt: data.nextAppointmentAt,
        babyName: data.babyName?.trim() ? data.babyName.trim() : null,
        updatedAt: now,
      },
      // K3. Everything off unless this publish says otherwise — `applyLevels`
      // inside `publishSnapshot` then drops any value whose level is off, so a
      // client sending a weight it was not entitled to share stores a null.
      data.sharing ?? SHARING_DEFAULTS,
      data.extras ?? emptyExtras(),
    );
    return NextResponse.json({ ok: true }, { headers: HEADERS });
  }

  if (data.action === "assign-task") {
    await assignTask(ctx.database, pregnancyId, data.itemKey, now);
    return NextResponse.json({ ok: true }, { headers: HEADERS });
  }

  if (data.action === "unassign-task") {
    await unassignTask(ctx.database, pregnancyId, data.itemKey);
    return NextResponse.json({ ok: true }, { headers: HEADERS });
  }

  if (data.action === "cheers-seen") {
    await markCheersSeen(ctx.database, pregnancyId, now);
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
