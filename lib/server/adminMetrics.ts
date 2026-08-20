import "server-only";

import { and, count, countDistinct, eq, gte, isNotNull, isNull, lt, max, sql } from "drizzle-orm";

import type { Database } from "./db";
import { invites, pregnancyMembers, pushSubscriptions, syncRecords, users } from "./schema";
import { SYNCED_STORES } from "@/lib/sync/stores";

// BUILD-PLAN K16 — `/admin/metricas`.
//
// **Pre-launch, and that is the whole reason it is in this batch.** Every
// number here is derived from rows the app already writes, so nothing needs a
// new event pipeline — but the *history* cannot be reconstructed later. Ship
// this after launch and the first month of "did onboarding work?" is gone.
//
// Two rules, and they are the same rule ARCHITECTURE.md §9 states for the rest
// of the panel:
//
//   1. **Aggregates only.** Every function here returns counts. None returns a
//      row, an id, an email or a date belonging to one person. The queries use
//      `count()` and `countDistinct()` precisely so there is no row to leak.
//   2. **Never `payload`.** `lib/server/admin.test.ts` scans this file for it
//      (K14 wrote that test; K16 added this file to its list). The panel can
//      say "412 registros de síntomas"; it may not say what one of them says.
//
// A third rule follows from the first two and is worth stating because it is
// the temptation: **there is no cohort small enough to be a person.** A "users
// in Itapúa who logged a symptom this week" filter would eventually return one
// row, and one row about health data is not an aggregate. Nothing here filters
// by anything but time and store, and adding a dimension is a data-contract
// decision, not a feature request.

const DAY_MS = 86_400_000;

export interface FunnelStep {
  label: string;
  count: number;
  /** Of the step before it. Null for the first. */
  ofPrevious: number | null;
}

/**
 * Onboarding, as far as the data can honestly report it.
 *
 * There is no per-step event log and K16 deliberately does not add one: an
 * analytics pipeline for a screen with five steps is a lot of new surface for
 * a question this answers well enough. What exists instead is the trail a
 * completed step leaves behind, which is a proxy and is labelled as one.
 *
 * The steps are ordered by what onboarding writes, in order (K1): an account
 * exists, then the profile row syncs, then the pregnancy row, then the invite
 * is created, then somebody accepts it. A drop between two of them is a step
 * people are abandoning.
 *
 * **This counts users who signed in only.** "Seguir sin cuenta" leaves no
 * server trail at all, by design, so the funnel cannot see it and does not
 * pretend to — the page says so above the numbers rather than presenting a
 * completion rate that silently excludes most of the app's users.
 */
export async function onboardingFunnel(database: Database): Promise<FunnelStep[]> {
  const [accounts, withProfile, withPregnancy, invitesSent, invitesAccepted] =
    await Promise.all([
      database.select({ total: count() }).from(users),
      database
        .select({ total: countDistinct(syncRecords.userId) })
        .from(syncRecords)
        .where(eq(syncRecords.store, "profile")),
      database
        .select({ total: countDistinct(syncRecords.userId) })
        .from(syncRecords)
        .where(eq(syncRecords.store, "pregnancy")),
      database
        .select({ total: countDistinct(invites.createdByUserId) })
        .from(invites),
      database
        .select({ total: countDistinct(invites.createdByUserId) })
        .from(invites)
        .where(isNotNull(invites.acceptedAt)),
    ]);

  const raw: [string, number][] = [
    ["Creó una cuenta", accounts[0]?.total ?? 0],
    ["Guardó su perfil", withProfile[0]?.total ?? 0],
    ["Guardó su embarazo", withPregnancy[0]?.total ?? 0],
    ["Invitó a alguien", invitesSent[0]?.total ?? 0],
    ["Alguien aceptó", invitesAccepted[0]?.total ?? 0],
  ];

  return raw.map(([label, value], index) => {
    const previous = index === 0 ? null : raw[index - 1]![1];
    return {
      label,
      count: value,
      // Guarded: a zero previous step makes a percentage meaningless, not
      // infinite, and "—" is the honest render.
      ofPrevious: previous && previous > 0 ? Math.round((value / previous) * 100) : null,
    };
  });
}

export interface InviteStats {
  role: "partner" | "family";
  sent: number;
  accepted: number;
  expired: number;
  revoked: number;
}

/**
 * Invites, by role.
 *
 * Split by role because they are different products: a pareja invite is the
 * one the growth story depends on, and averaging it with familia invites hides
 * whichever one is failing.
 *
 * `expired` counts only invites that are past their date AND were never
 * accepted AND were never revoked — otherwise an accepted invite whose original
 * expiry has passed would be counted twice and the columns would not add up.
 */
export async function inviteStats(
  database: Database,
  now: Date = new Date(),
): Promise<InviteStats[]> {
  const rows = await database
    .select({
      role: invites.role,
      sent: count(),
      accepted: sql<number>`sum(case when ${invites.acceptedAt} is not null then 1 else 0 end)`,
      revoked: sql<number>`sum(case when ${invites.revokedAt} is not null then 1 else 0 end)`,
      expired: sql<number>`sum(case when ${invites.acceptedAt} is null and ${invites.revokedAt} is null and ${invites.expiresAt} < ${now} then 1 else 0 end)`,
    })
    .from(invites)
    .groupBy(invites.role);

  return rows
    .filter((row) => row.role !== "owner")
    .map((row) => ({
      role: row.role as "partner" | "family",
      sent: Number(row.sent),
      accepted: Number(row.accepted),
      expired: Number(row.expired),
      revoked: Number(row.revoked),
    }));
}

export interface ActiveUsers {
  daily: number;
  weekly: number;
  /** DAU/WAU as a percentage — the standard stickiness ratio. */
  stickiness: number | null;
}

/**
 * Active users, from the only activity signal the server has.
 *
 * `syncRecords.serverUpdatedAt` is when we accepted a write, so this measures
 * **people who changed something**, not people who opened the app. That is a
 * narrower and harsher number than a real DAU and the page labels it as such:
 * a woman who reads her week and closes the app is not counted, and she is a
 * successful user.
 *
 * There is no better signal available without adding one, and adding one would
 * mean a request whose only purpose is to say "I am here" — a beacon, from a
 * health app, attached to an account. Not worth it for a nicer chart.
 */
export async function activeUsers(
  database: Database,
  now: Date = new Date(),
): Promise<ActiveUsers> {
  const since = (days: number) => now.getTime() - days * DAY_MS;

  const [daily, weekly] = await Promise.all([
    database
      .select({ total: countDistinct(syncRecords.userId) })
      .from(syncRecords)
      .where(gte(syncRecords.serverUpdatedAt, since(1))),
    database
      .select({ total: countDistinct(syncRecords.userId) })
      .from(syncRecords)
      .where(gte(syncRecords.serverUpdatedAt, since(7))),
  ]);

  const d = daily[0]?.total ?? 0;
  const w = weekly[0]?.total ?? 0;
  return { daily: d, weekly: w, stickiness: w > 0 ? Math.round((d / w) * 100) : null };
}

export interface RetentionProxy {
  /** Accounts old enough for the question to be askable. */
  eligible: number;
  /** Of those, how many wrote something in their second week. */
  returned: number;
  percent: number | null;
}

/**
 * Week-2 retention, as a proxy.
 *
 * "Did she still write something 7–14 days after signing up?" — the single
 * number that says whether this app is a habit or a download. A proxy for the
 * same reason as `activeUsers`: writing is the only activity the server sees.
 *
 * Only accounts **at least 14 days old** are eligible, which matters more than
 * it looks: including younger accounts would count everyone who signed up
 * yesterday as "did not return" and drag the number down every time the app
 * grew. A retention metric that falls when you acquire users is worse than no
 * metric, because people act on it.
 */
export async function weekTwoRetention(
  database: Database,
  now: Date = new Date(),
): Promise<RetentionProxy> {
  const cutoff = new Date(now.getTime() - 14 * DAY_MS);

  const eligibleRows = await database
    .select({ total: count() })
    .from(users)
    .where(lt(users.createdAt, cutoff));

  // A write whose server timestamp is 7–14 days after the account was created.
  const returnedRows = await database
    .select({ total: countDistinct(users.id) })
    .from(users)
    .innerJoin(syncRecords, eq(syncRecords.userId, users.id))
    .where(
      and(
        lt(users.createdAt, cutoff),
        gte(
          syncRecords.serverUpdatedAt,
          sql`unix_timestamp(${users.createdAt}) * 1000 + ${7 * DAY_MS}`,
        ),
        lt(
          syncRecords.serverUpdatedAt,
          sql`unix_timestamp(${users.createdAt}) * 1000 + ${14 * DAY_MS}`,
        ),
      ),
    );

  const eligible = eligibleRows[0]?.total ?? 0;
  const returned = returnedRows[0]?.total ?? 0;
  return {
    eligible,
    returned,
    percent: eligible > 0 ? Math.round((returned / eligible) * 100) : null,
  };
}

export interface ToolUsage {
  store: string;
  users: number;
  records: number;
}

/**
 * Which tools people actually use, by store.
 *
 * `records` is how many rows exist; `users` is how many distinct accounts have
 * one. Both, because they answer different questions — 4 000 kick sessions
 * from 12 women is a very different product signal from 4 000 from 900, and
 * one number alone cannot tell them apart.
 *
 * Live rows only (`deletedAt is null`): a tool somebody tried and deleted
 * everything from is not a tool they use.
 */
export async function toolUsage(database: Database): Promise<ToolUsage[]> {
  const rows = await database
    .select({
      store: syncRecords.store,
      users: countDistinct(syncRecords.userId),
      records: count(),
    })
    .from(syncRecords)
    .where(isNull(syncRecords.deletedAt))
    .groupBy(syncRecords.store);

  const found = new Map(rows.map((row) => [row.store as string, row]));

  // Every synced store appears, including the ones with nothing in them. A
  // tool that nobody has ever used is the most actionable row on this page and
  // it is exactly the row a `GROUP BY` omits.
  return SYNCED_STORES.map((store) => {
    const row = found.get(store);
    return {
      store,
      users: Number(row?.users ?? 0),
      records: Number(row?.records ?? 0),
    };
  }).sort((a, b) => b.users - a.users || a.store.localeCompare(b.store));
}

export interface ReachStats {
  /** Accounts that have at least one live push subscription. */
  usersWithPush: number;
  /** Devices, including the anonymous ones no account will ever claim (B5). */
  devices: number;
  anonymousDevices: number;
  /** Live non-owner memberships — the family the app has actually reached. */
  companions: number;
  /** Owners with at least one live companion. */
  ownersSharing: number;
}

export async function reachStats(database: Database): Promise<ReachStats> {
  const [withPush, devices, anonymous, companions, sharing] = await Promise.all([
    database
      .select({ total: countDistinct(pushSubscriptions.userId) })
      .from(pushSubscriptions)
      .where(isNotNull(pushSubscriptions.userId)),
    database.select({ total: count() }).from(pushSubscriptions),
    database
      .select({ total: count() })
      .from(pushSubscriptions)
      .where(isNull(pushSubscriptions.userId)),
    database
      .select({ total: count() })
      .from(pregnancyMembers)
      .where(
        and(eq(pregnancyMembers.role, "partner"), isNull(pregnancyMembers.revokedAt)),
      ),
    database
      .select({ total: countDistinct(pregnancyMembers.pregnancyId) })
      .from(pregnancyMembers)
      .where(isNull(pregnancyMembers.revokedAt)),
  ]);

  return {
    usersWithPush: withPush[0]?.total ?? 0,
    devices: devices[0]?.total ?? 0,
    anonymousDevices: anonymous[0]?.total ?? 0,
    companions: companions[0]?.total ?? 0,
    ownersSharing: sharing[0]?.total ?? 0,
  };
}

export interface Metrics {
  funnel: FunnelStep[];
  invites: InviteStats[];
  active: ActiveUsers;
  retention: RetentionProxy;
  tools: ToolUsage[];
  reach: ReachStats;
  /** The newest write the server has seen, so a dead page is obvious. */
  lastWriteAt: number | null;
}

export async function allMetrics(
  database: Database,
  now: Date = new Date(),
): Promise<Metrics> {
  const [funnel, invitesByRole, active, retention, tools, reach, latest] =
    await Promise.all([
      onboardingFunnel(database),
      inviteStats(database, now),
      activeUsers(database, now),
      weekTwoRetention(database, now),
      toolUsage(database),
      reachStats(database),
      database.select({ latest: max(syncRecords.serverUpdatedAt) }).from(syncRecords),
    ]);

  return {
    funnel,
    invites: invitesByRole,
    active,
    retention,
    tools,
    reach,
    lastWriteAt: latest[0]?.latest ?? null,
  };
}
