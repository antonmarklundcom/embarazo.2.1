// NOTE: no `import "server-only"` here, deliberately. drizzle-kit reads this
// file with plain Node to generate migrations, and the server-only shim throws
// outside a React Server Component. The guard lives in `./db.ts` instead —
// which is the file that actually holds credentials and runs queries, so it is
// the boundary that matters. This file is pure table definitions: no secrets,
// no runtime access. Importing it from a client component would only bloat the
// bundle, and `db()` would still be unreachable.

import {
  bigint,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

// BUILD-PLAN A1 — server-side schema (MySQL + Drizzle).
//
// Read ARCHITECTURE.md §4 (the data contract) before changing anything here.
// Two rules are structural, not stylistic:
//
//   1. `syncRecords.payload` is OPAQUE. The server stores it, returns it and
//      compares its `updatedAt`; it never queries into it, indexes it, or uses
//      it for targeting — and `/admin` never renders it. That is what keeps
//      client-side encryption of the payload a future option instead of a
//      rewrite, and it is what makes the admin panel defensible.
//   2. `contentStats` carries NO user identity. Not a user id, not a session,
//      not an IP. If a future counter needs to know "who", it does not belong
//      in this table.
//
// `import "server-only"` at the top makes a client component importing this
// file a build error rather than a silent bundle leak.

// ---------------------------------------------------------------------------
// Auth.js core tables
//
// Shapes follow @auth/drizzle-adapter's MySQL schema so A2 can hand these
// straight to the adapter. Do not rename columns to match our conventions —
// the adapter looks them up by name (hence the snake_case OAuth token fields).
// ---------------------------------------------------------------------------

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: timestamp("emailVerified", { mode: "date", fsp: 3 }),
    image: varchar("image", { length: 512 }),

    // A7: admin access. Seeded from the ADMIN_EMAILS allowlist so the first
    // admin can exist before anyone can grant the role.
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),

    createdAt: timestamp("createdAt", { mode: "date", fsp: 3 })
      .defaultNow()
      .notNull(),
    // Set when the user asks for deletion; the purge job removes the rows. Kept
    // so an in-flight deletion is visible rather than looking like data loss.
    deletedAt: timestamp("deletedAt", { mode: "date", fsp: 3 }),
  },
  (table) => ({
    // One account per email address. Signing in with Google and then Facebook
    // on the same address links providers to this row rather than creating a
    // second account with a second copy of the pregnancy.
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const accounts = mysqlTable(
  "accounts",
  {
    userId: varchar("userId", { length: 255 }).notNull(),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: int("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
    userIdx: index("accounts_user_idx").on(table.userId),
  }),
);

export const sessions = mysqlTable("sessions", {
  sessionToken: varchar("sessionToken", { length: 255 }).primaryKey(),
  userId: varchar("userId", { length: 255 }).notNull(),
  expires: timestamp("expires", { mode: "date", fsp: 3 }).notNull(),
});

export const verificationTokens = mysqlTable(
  "verificationTokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date", fsp: 3 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

// ---------------------------------------------------------------------------
// Pregnancies & membership (E1 family sharing)
// ---------------------------------------------------------------------------

/** Roles map to the onboarding roles in FEATURE-MAP #1. */
export const MEMBER_ROLES = ["owner", "partner", "family"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const pregnancies = mysqlTable(
  "pregnancies",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    ownerUserId: varchar("ownerUserId", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", fsp: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
    deletedAt: bigint("deletedAt", { mode: "number" }),
  },
  (table) => ({
    ownerIdx: index("pregnancies_owner_idx").on(table.ownerUserId),
  }),
);

export const pregnancyMembers = mysqlTable(
  "pregnancyMembers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    pregnancyId: varchar("pregnancyId", { length: 64 }).notNull(),
    userId: varchar("userId", { length: 255 }).notNull(),
    role: mysqlEnum("role", MEMBER_ROLES).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", fsp: 3 })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revokedAt", { mode: "date", fsp: 3 }),
  },
  (table) => ({
    // One membership row per (pregnancy, user) — re-invites update in place.
    uniqueMember: uniqueIndex("pregnancy_members_unique").on(
      table.pregnancyId,
      table.userId,
    ),
    userIdx: index("pregnancy_members_user_idx").on(table.userId),
  }),
);

export const invites = mysqlTable(
  "invites",
  {
    // The shareable code itself — short, random, and the primary key so a
    // lookup is a single indexed read.
    code: varchar("code", { length: 32 }).primaryKey(),
    pregnancyId: varchar("pregnancyId", { length: 64 }).notNull(),
    role: mysqlEnum("role", MEMBER_ROLES).notNull(),
    createdByUserId: varchar("createdByUserId", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", fsp: 3 })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expiresAt", { mode: "date", fsp: 3 }).notNull(),
    acceptedByUserId: varchar("acceptedByUserId", { length: 255 }),
    acceptedAt: timestamp("acceptedAt", { mode: "date", fsp: 3 }),
    revokedAt: timestamp("revokedAt", { mode: "date", fsp: 3 }),
  },
  (table) => ({
    pregnancyIdx: index("invites_pregnancy_idx").on(table.pregnancyId),
  }),
);

// ---------------------------------------------------------------------------
// Sync (A3)
// ---------------------------------------------------------------------------

/**
 * Dexie stores that sync. Photos are deliberately absent — they never leave
 * the device in v1 (ARCHITECTURE.md §4.4). Adding a store here is a data
 * contract decision, not a refactor.
 */
export const SYNCED_STORES = [
  "profile",
  "symptomEntries",
  "kickSessions",
  "contractions",
  "weights",
  "appointments",
  "checklistItems",
  "cycles",
  "cycleSettings",
  "clinical",
  "journal",
] as const;
export type SyncedStore = (typeof SYNCED_STORES)[number];

export const syncRecords = mysqlTable(
  "syncRecords",
  {
    userId: varchar("userId", { length: 255 }).notNull(),
    store: mysqlEnum("store", SYNCED_STORES).notNull(),
    recordId: varchar("recordId", { length: 128 }).notNull(),

    // Which pregnancy the record belongs to, for family sharing. Null for
    // records that are not pregnancy-scoped (e.g. cycle data).
    pregnancyId: varchar("pregnancyId", { length: 64 }),

    // Epoch milliseconds, client-authored. Last-write-wins compares these.
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
    // Soft delete so a deletion propagates to the user's other devices.
    deletedAt: bigint("deletedAt", { mode: "number" }),

    // OPAQUE. See the header note: never queried into, never indexed.
    payload: json("payload"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.userId, table.store, table.recordId],
    }),
    // Drives the `GET /api/v1/sync?since=` pull.
    sinceIdx: index("sync_records_since_idx").on(table.userId, table.updatedAt),
    pregnancyIdx: index("sync_records_pregnancy_idx").on(table.pregnancyId),
  }),
);

// ---------------------------------------------------------------------------
// Push (B5)
// ---------------------------------------------------------------------------

export const PUSH_CATEGORIES = ["consejos", "recordatorios", "avisos"] as const;
export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export const pushSubscriptions = mysqlTable(
  "pushSubscriptions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("userId", { length: 255 }).notNull(),
    endpoint: varchar("endpoint", { length: 512 }).notNull(),
    p256dh: varchar("p256dh", { length: 255 }).notNull(),
    auth: varchar("auth", { length: 255 }).notNull(),
    // Per-category opt-ins (FEATURE-MAP #7) — each toggles independently.
    categories: json("categories").$type<PushCategory[]>().notNull(),
    createdAt: timestamp("createdAt", { mode: "date", fsp: 3 })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("lastSeenAt", { mode: "date", fsp: 3 }),
  },
  (table) => ({
    endpointUnique: uniqueIndex("push_subscriptions_endpoint_unique").on(
      table.endpoint,
    ),
    userIdx: index("push_subscriptions_user_idx").on(table.userId),
  }),
);

// ---------------------------------------------------------------------------
// AI baby image (F1/F2) — the one feature with a per-use cash cost
// ---------------------------------------------------------------------------

export const aiGenerations = mysqlTable(
  "aiGenerations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("userId", { length: 255 }).notNull(),
    // "YYYY-MM" — the quota window. Denormalised so the quota check is one
    // indexed count instead of a date range scan on every request.
    quotaMonth: varchar("quotaMonth", { length: 7 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["pending", "succeeded", "failed"]).notNull(),
    // Cost in USD micros (1_000_000 = $1) so spend sums stay exact.
    costUsdMicros: int("costUsdMicros"),
    createdAt: timestamp("createdAt", { mode: "date", fsp: 3 })
      .defaultNow()
      .notNull(),
    // NOTE: input photos are never stored (ARCHITECTURE.md §10). This table
    // records that a generation happened and what it cost, nothing more.
  },
  (table) => ({
    quotaIdx: index("ai_generations_quota_idx").on(
      table.userId,
      table.quotaMonth,
    ),
    spendIdx: index("ai_generations_spend_idx").on(table.quotaMonth),
  }),
);

// ---------------------------------------------------------------------------
// Anonymous aggregate stats (C7 / I2)
// ---------------------------------------------------------------------------

export const contentStats = mysqlTable(
  "contentStats",
  {
    // Pregnancy week the reader was in, 0 = not applicable.
    week: int("week").notNull(),
    contentId: varchar("contentId", { length: 128 }).notNull(),
    // "YYYY-MM-DD" — daily buckets, so nothing resembles a session trail.
    day: varchar("day", { length: 10 }).notNull(),
    views: int("views").default(0).notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.week, table.contentId, table.day],
    }),
    // NO user column here, by design. See the header note.
  }),
);

// ---------------------------------------------------------------------------
// Admin audit (A7)
// ---------------------------------------------------------------------------

export const adminAudit = mysqlTable(
  "adminAudit",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    actorUserId: varchar("actorUserId", { length: 255 }).notNull(),
    action: varchar("action", { length: 128 }).notNull(),
    targetUserId: varchar("targetUserId", { length: 255 }),
    // Context for the action (never health content).
    meta: json("meta"),
    createdAt: timestamp("createdAt", { mode: "date", fsp: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    actorIdx: index("admin_audit_actor_idx").on(table.actorUserId),
    targetIdx: index("admin_audit_target_idx").on(table.targetUserId),
  }),
);

export const schema = {
  users,
  accounts,
  sessions,
  verificationTokens,
  pregnancies,
  pregnancyMembers,
  invites,
  syncRecords,
  pushSubscriptions,
  aiGenerations,
  contentStats,
  adminAudit,
};
