import "server-only";

import { notFound } from "next/navigation";
import { and, count, desc, eq, isNull, max } from "drizzle-orm";

import { db, dbOrNull, isDatabaseConfigured, type Database } from "./db";
import { getSession, isAuthAvailable } from "./auth";
import {
  accounts,
  adminAudit,
  aiGenerations,
  invites,
  pregnancyMembers,
  pushSubscriptions,
  syncRecords,
  users,
} from "./schema";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { parseAuditMeta, type AdminAction } from "@/lib/admin/audit";

export { ADMIN_ACTIONS, type AdminAction } from "@/lib/admin/audit";

// BUILD-PLAN A7 — the admin floor.
//
// Two rules from ARCHITECTURE.md §9 are structural here, not stylistic:
//
//   1. A non-admin gets a 404, never a 403. Confirming that `/admin` exists
//      tells a stranger there is something to attack. `notFound()` is used
//      everywhere, including for a signed-in non-admin.
//   2. The panel sees METADATA ONLY. Nothing in this file selects
//      `syncRecords.payload`, and `admin.test.ts` fails the build if the word
//      appears anywhere under `app/admin` or in this module. The panel can say
//      "37 registros de síntomas"; it must never be able to say what they say.

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

export interface AdminActor {
  id: string;
  email: string;
}

/**
 * The signed-in administrator, or a 404.
 *
 * Every `/admin` route and every admin action calls this. It never returns
 * null: the only way past it is being an admin, and the only other outcome is
 * `notFound()`, which throws.
 */
export async function requireAdmin(): Promise<AdminActor> {
  if (!isAuthAvailable() || !isDatabaseConfigured()) notFound();

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) notFound();

  const rows = await db()
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = rows[0];
  // The role in the database is the authority, not the allowlist and not the
  // session: revoking an admin has to take effect on the next request without
  // waiting for a token to expire or a deploy to change an env var.
  if (!user || user.role !== "admin") notFound();

  return { id: user.id, email: user.email };
}

/**
 * Promote an account whose email is on the `ADMIN_EMAILS` allowlist.
 *
 * Called from the Auth.js sign-in event so the first administrator exists
 * without anyone being able to grant it. It only ever promotes: taking the
 * role away is a deliberate database change, so removing an address from the
 * allowlist does not silently strip access mid-incident.
 */
export async function syncAdminRoleFromAllowlist(
  userId: string,
  email: string | null | undefined,
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  if (!isAdminEmail(email, process.env)) return;

  await db().update(users).set({ role: "admin" }).where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------


/**
 * Write an `adminAudit` row.
 *
 * ARCHITECTURE.md §9: "every mutating admin action writes an audit row. No
 * exceptions — this is what makes the access defensible." `meta` is for
 * context like an invite code or a deletion's row counts; it must never carry
 * health content, which is enforced by there being no way to read any.
 */
export async function recordAudit(
  database: Database,
  entry: {
    actorUserId: string;
    action: AdminAction;
    targetUserId?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  // The shape is checked here rather than trusted from the call site: this is
  // the one table A5's deletion retains, so a careless payload outlives the
  // user it describes (see lib/admin/audit.ts).
  const meta = parseAuditMeta(entry.action, entry.meta);

  await database.insert(adminAudit).values({
    id: crypto.randomUUID(),
    actorUserId: entry.actorUserId,
    action: entry.action,
    targetUserId: entry.targetUserId ?? null,
    meta: Object.keys(meta).length > 0 ? meta : null,
  });
}

export async function recentAudit(database: Database, limit = 25) {
  return database
    .select()
    .from(adminAudit)
    .orderBy(desc(adminAudit.createdAt))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Metadata queries
// ---------------------------------------------------------------------------

/**
 * Everything the support console may know about an account.
 *
 * This type is the privacy boundary in code form: counts and timestamps, no
 * record bodies. If a future field here would let someone read what a user
 * wrote, it does not belong in the type, never mind the query.
 */
export interface AccountOverview {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  createdAt: Date;
  consentAt: Date | null;
  consentVersion: string | null;
  providers: string[];
  /** Per-store counts. The panel says "37 registros", never what they are. */
  recordCounts: { store: string; total: number; deleted: number }[];
  /** Server-clock ms of the newest accepted write, or null. */
  lastSyncAt: number | null;
  deviceCount: number;
  membershipCount: number;
  aiGenerationCount: number;
}

export async function findUserByEmail(
  database: Database,
  email: string,
): Promise<{ id: string; email: string; name: string | null }[]> {
  return database
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(5);
}

export async function accountOverview(
  database: Database,
  userId: string,
): Promise<AccountOverview | null> {
  const rows = await database
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      consentAt: users.healthDataConsentAt,
      consentVersion: users.healthDataConsentVersion,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = rows[0];
  if (!user) return null;

  const [providerRows, counts, deletedCounts, lastSync, devices, memberships, ai] =
    await Promise.all([
      database
        .select({ provider: accounts.provider })
        .from(accounts)
        .where(eq(accounts.userId, userId)),
      // Grouped counts only. Note there is no `payload` anywhere in this file.
      database
        .select({ store: syncRecords.store, total: count() })
        .from(syncRecords)
        .where(eq(syncRecords.userId, userId))
        .groupBy(syncRecords.store),
      database
        .select({ store: syncRecords.store, total: count() })
        .from(syncRecords)
        .where(
          and(eq(syncRecords.userId, userId), isNull(syncRecords.deletedAt)),
        )
        .groupBy(syncRecords.store),
      database
        .select({ latest: max(syncRecords.serverUpdatedAt) })
        .from(syncRecords)
        .where(eq(syncRecords.userId, userId)),
      database
        .select({ total: count() })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId)),
      database
        .select({ total: count() })
        .from(pregnancyMembers)
        .where(eq(pregnancyMembers.userId, userId)),
      database
        .select({ total: count() })
        .from(aiGenerations)
        .where(eq(aiGenerations.userId, userId)),
    ]);

  const liveByStore = new Map(deletedCounts.map((r) => [r.store, r.total]));

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    consentAt: user.consentAt,
    consentVersion: user.consentVersion,
    providers: providerRows.map((r) => r.provider),
    recordCounts: counts.map((r) => ({
      store: r.store,
      total: r.total,
      deleted: r.total - (liveByStore.get(r.store) ?? 0),
    })),
    lastSyncAt: lastSync[0]?.latest ?? null,
    deviceCount: devices[0]?.total ?? 0,
    membershipCount: memberships[0]?.total ?? 0,
    aiGenerationCount: ai[0]?.total ?? 0,
  };
}

/** Invites the user created or accepted — codes and dates, never content. */
export async function invitesForUser(database: Database, userId: string) {
  return database
    .select({
      code: invites.code,
      pregnancyId: invites.pregnancyId,
      role: invites.role,
      createdAt: invites.createdAt,
      expiresAt: invites.expiresAt,
      acceptedAt: invites.acceptedAt,
      revokedAt: invites.revokedAt,
    })
    .from(invites)
    .where(eq(invites.createdByUserId, userId))
    .orderBy(desc(invites.createdAt))
    .limit(20);
}

/** The handle for admin routes, or null when this deployment has no database. */
export function adminDb(): Database | null {
  return dbOrNull();
}
