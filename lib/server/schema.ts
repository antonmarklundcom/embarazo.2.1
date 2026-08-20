// NOTE: no `import "server-only"` here, deliberately. drizzle-kit reads this
// file with plain Node to generate migrations, and the server-only shim throws
// outside a React Server Component. The guard lives in `./db.ts` instead —
// which is the file that actually holds credentials and runs queries, so it is
// the boundary that matters. This file is pure table definitions: no secrets,
// no runtime access. Importing it from a client component would only bloat the
// bundle, and `db()` would still be unreachable.

import {
  bigint,
  boolean,
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

    // A2: the explicit health-data consent taken at sign-up (ARCHITECTURE.md
    // §8). Nullable because a row can exist without it — the sign-in callback
    // refuses those, and a null here is the evidence that it did. The version
    // records WHICH consent text was accepted, so re-consenting after a
    // material rewrite is a query, not an archaeology project.
    healthDataConsentAt: timestamp("healthDataConsentAt", {
      mode: "date",
      fsp: 3,
    }),
    healthDataConsentVersion: varchar("healthDataConsentVersion", {
      length: 64,
    }),

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
    // K14 — UNIQUE, not a plain index.
    //
    // `ensurePregnancyForOwner` reads, finds nothing, and inserts. Two
    // requests from the same account arriving together (an app open racing a
    // sharing publish, or a double-tapped invite) both read nothing and both
    // insert, and the owner ends up with two pregnancies. The second one is
    // the one companions get invited to and the first is the one her device
    // keeps publishing into — a family that sees a permanently stale snapshot,
    // with no error anywhere to explain it.
    //
    // The database is the only place that race can be settled, so it settles
    // it: the losing insert gets a duplicate-key error instead of a row.
    ownerIdx: uniqueIndex("pregnancies_owner_idx").on(table.ownerUserId),
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
    /**
     * K8 — "¿quién la acompaña?". The epoch ms of the control this member said
     * they would come to, or null.
     *
     * A **timestamp rather than a boolean**, deliberately: it is the only way
     * the marker can expire on its own. When the mamá moves the control, every
     * stored "yo la acompaño" stops matching it and she sees an empty list —
     * she asks again, instead of the app quietly telling her somebody is coming
     * to a date nobody agreed to. `isAccompanying` (lib/appointments.ts) is
     * that comparison, and it is the only thing that reads this column.
     *
     * It is an RSVP, not health data: the appointment it points at is already
     * in `companionSnapshots`, shared with this exact member, so K8 adds no
     * server-legible health field at all.
     */
    accompanyingAt: bigint("accompanyingAt", { mode: "number" }),
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

/**
 * E1 — the ONLY thing a non-owner can read.
 *
 * This table is a deliberate, narrow exception to §4.3, and it is worth being
 * explicit about. Everywhere else the server holds health data as an opaque
 * payload it cannot read. Family sharing cannot work that way: a partner
 * signing in on their own phone has to be served the week and the due date by
 * the server, so those specific fields are stored here in plain columns.
 *
 * What that buys is that the exception is *bounded and legible*. The alternative
 * — letting a companion pull the owner's `syncRecords` and filtering out notes
 * and photos — is a rule that fails open the first time somebody adds a field.
 * Here, a companion view can only ever show what is in this table, so widening
 * it is a schema change in a reviewed diff.
 *
 * The owner's device writes this; nothing else does. Journal notes, symptoms,
 * moods, weights, cycles, clinical data and photos have no column here and
 * never will (`FORBIDDEN_COMPANION_FIELDS`, asserted by test).
 */
export const companionSnapshots = mysqlTable("companionSnapshots", {
  pregnancyId: varchar("pregnancyId", { length: 64 }).primaryKey(),
  /** Friendly 1-based week (DECISIONS.md B3), not completed weeks. */
  week: int("week"),
  dueDate: bigint("dueDate", { mode: "number" }),
  nextAppointmentAt: bigint("nextAppointmentAt", { mode: "number" }),
  babyName: varchar("babyName", { length: 64 }),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),

  // -------------------------------------------------------------------------
  // K3 — sharing levels. The owner's per-field opt-in, for the pareja only.
  // -------------------------------------------------------------------------
  //
  // The flags are stored next to the data rather than only on the owner's
  // device, so "off" is enforced at READ time as well as at publish time. A
  // device that goes offline forever after switching a level off must not leave
  // the server serving that value; nulling it needs one write, and until that
  // write lands the flag is what the read obeys.
  //
  // Defaults are false in the column, not just in the client, because a row
  // written by an older client has to mean "not shared".
  sharePeso: boolean("sharePeso").notNull().default(false),
  sharePataditas: boolean("sharePataditas").notNull().default(false),
  /**
   * K3 records the preference; K4 is what will have anything to publish under
   * it (ARCHITECTURE.md §4.4 — photos do not leave the device until then).
   * There is deliberately no photo column here yet: guessing at K4's shape
   * would be worse than adding it when K4 knows.
   */
  shareFotos: boolean("shareFotos").notNull().default(false),

  /** Weight in GRAMS — an integer on the wire, no decimal/float rounding. */
  weightGrams: int("weightGrams"),
  weightAt: bigint("weightAt", { mode: "number" }),
  kickCount: int("kickCount"),
  kickAt: bigint("kickAt", { mode: "number" }),
});

/**
 * K2 — checklist items the owner assigned to her pareja.
 *
 * The **second** bounded exception to §4.3, and it is bounded the same way the
 * snapshot is: `itemKey` is a key from `SHARED_TASK_KEYS` (every item in
 * `lib/checklists.ts`), validated at the API boundary, and the *label* is
 * rendered from the seed on the reading device. No prose an owner types can
 * land here, because there is no column for prose and the boundary would reject
 * a key it does not recognise.
 *
 * What the server therefore learns is "this pregnancy asked its partner to pack
 * the carné" — a coarse, non-clinical fact about a shared to-do list. That is
 * the price of the feature; a companion on their own phone has to be served the
 * list by somebody. It buys the same property as `companionSnapshots`: the
 * exception is finite and reviewable, rather than "a companion can read the
 * owner's records with a filter applied".
 *
 * `family` members never see this table (`canSeeSharedTasks`).
 */
export const companionTasks = mysqlTable(
  "companionTasks",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    pregnancyId: varchar("pregnancyId", { length: 64 }).notNull(),
    /** A key from lib/checklists.ts. Never a label, never free text. */
    itemKey: varchar("itemKey", { length: 64 }).notNull(),
    /** Epoch ms when the pareja ticked it, or null. */
    doneAt: bigint("doneAt", { mode: "number" }),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  (table) => ({
    // One assignment per item per pregnancy: assigning twice is the same
    // assignment, not a second row that the partner sees twice.
    pregnancyItem: uniqueIndex("companionTasks_pregnancy_item").on(
      table.pregnancyId,
      table.itemKey,
    ),
  }),
);

/**
 * K2 — "mandale ánimo": a one-tap reaction from a companion to the owner.
 *
 * `cheerId` is an id from `lib/sharing/cheers.ts` and nothing else. There is no
 * text column here and there will not be one: a free-text channel from a
 * partner or a family member into a pregnant user's home screen is a moderation
 * surface this app has no way to staff. The words live in the client seed; the
 * server stores which of five buttons somebody pressed.
 *
 * `fromUserId` is kept so the owner can be told *who* cheered — and so a
 * revoked member's cheers can be dropped with their membership.
 */
export const companionCheers = mysqlTable(
  "companionCheers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    pregnancyId: varchar("pregnancyId", { length: 64 }).notNull(),
    fromUserId: varchar("fromUserId", { length: 255 }).notNull(),
    /** An id from CHEERS. Validated at the boundary; never prose. */
    cheerId: varchar("cheerId", { length: 32 }).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    /** Epoch ms when the owner's device acknowledged it, or null. */
    seenAt: bigint("seenAt", { mode: "number" }),
  },
  (table) => ({
    byPregnancy: index("companionCheers_pregnancy").on(table.pregnancyId),
  }),
);

/**
 * K4 — the index of a user's backed-up photos (ARCHITECTURE.md §4.4, amended).
 *
 * §4.4 used to say photos never leave the device. K4 turns that into an
 * **explicit opt-in**, and this is the row that exists for a photo that has
 * been uploaded. The bytes are not here — they are in object storage under
 * `fotos/{userId}/{store}/{recordId}` — and neither is anything about the
 * pregnancy.
 *
 * `payload` is the SAME opaque envelope as `syncRecords.payload` (§4.3): the
 * photo's own metadata (which week the bump photo is from, when it was taken)
 * as JSON the server never queries into, never indexes and never uses for
 * anything. A bump photo's week is health data; putting it in a column would
 * have been a third §4.3 exception, and this one is not needed — the server
 * has no reason to know it, it only has to hand it back.
 *
 * So what the server learns from this table is: *this account has N objects,
 * of these sizes, of these types, changed at these times.* That is the honest
 * cost of "sign in and your photos are back", and the consent copy says it.
 *
 * `objectKey` is stored rather than recomputed so deletion is a fact about a
 * row rather than a re-derivation that could drift from what was written.
 */
export const photoBlobs = mysqlTable(
  "photoBlobs",
  {
    userId: varchar("userId", { length: 255 }).notNull(),
    /** "photoEntries" | "carnePhotos" — see lib/photos/keys.ts. */
    store: varchar("store", { length: 32 }).notNull(),
    recordId: varchar("recordId", { length: 64 }).notNull(),
    objectKey: varchar("objectKey", { length: 512 }).notNull(),
    contentType: varchar("contentType", { length: 64 }).notNull(),
    bytes: int("bytes").notNull(),
    /** Opaque to the server, exactly like syncRecords.payload (§4.3). */
    payload: json("payload"),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
    /** Soft delete, so a second device learns the photo is gone. */
    deletedAt: bigint("deletedAt", { mode: "number" }),
    serverUpdatedAt: bigint("serverUpdatedAt", { mode: "number" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.store, table.recordId] }),
    byUser: index("photoBlobs_user_idx").on(table.userId, table.serverUpdatedAt),
  }),
);

// ---------------------------------------------------------------------------
// Sync (A3)
// ---------------------------------------------------------------------------

// A3 moved the canonical list to `lib/sync/stores.ts` and corrected it: the
// names here were provisional and did not match a single actual Dexie table
// (`symptomEntries` vs `journalEntries`, an `appointments` store that does not
// exist, no `pregnancy`). Both ends of the wire now read one list. The
// relative import is deliberate — drizzle-kit reads this file outside Next.js,
// where the `@/` alias does not resolve.
export {
  SYNCED_STORES,
  type SyncedStore,
} from "../sync/stores";
import { SYNCED_STORES } from "../sync/stores";

export const syncRecords = mysqlTable(
  "syncRecords",
  {
    userId: varchar("userId", { length: 255 }).notNull(),
    store: mysqlEnum("store", SYNCED_STORES).notNull(),
    recordId: varchar("recordId", { length: 128 }).notNull(),

    // Which pregnancy the record belongs to, for family sharing. Null for
    // records that are not pregnancy-scoped (e.g. cycle data).
    pregnancyId: varchar("pregnancyId", { length: 64 }),

    // Epoch milliseconds, CLIENT-authored. Last-write-wins compares these and
    // nothing else — it is the only ordering two offline devices share.
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
    // Soft delete so a deletion propagates to the user's other devices.
    deletedAt: bigint("deletedAt", { mode: "number" }),

    // Epoch milliseconds, SERVER-authored: when this row was last written here.
    //
    // The pull cursor uses this, never `updatedAt`. Mixing the two clocks is a
    // silent data-loss bug: a record stamped 10:00 by a phone that was offline
    // until 11:00 arrives after a device has already pulled "everything up to
    // 10:30", and would never be delivered. Ordering the pull by the server's
    // own write clock has no such gap, and A3's convergence tests fail without
    // this column.
    serverUpdatedAt: bigint("serverUpdatedAt", { mode: "number" }).notNull(),

    // OPAQUE. See the header note: never queried into, never indexed.
    payload: json("payload"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.userId, table.store, table.recordId],
    }),
    // Drives the `GET /api/v1/sync?since=` pull, in server-clock order.
    sinceIdx: index("sync_records_since_idx").on(
      table.userId,
      table.serverUpdatedAt,
    ),
    pregnancyIdx: index("sync_records_pregnancy_idx").on(table.pregnancyId),
  }),
);

// ---------------------------------------------------------------------------
// Push (B5)
// ---------------------------------------------------------------------------

// PR-5b — re-exported from `lib/push/categories.ts`, not redeclared.
//
// This file used to carry its own copy of the list, and the copies drifted the
// moment `mimos` was added: the enum column still described three categories
// while the app offered four, so the *type* of a subscription row stopped
// matching the type of the value being written into it. A `mysqlEnum` built
// from a stale literal is worse than a type error, because the column it
// generates silently rejects the new value at runtime.
//
// The import direction is safe: `lib/push/categories.ts` is pure and
// dependency-free (it is imported by the service worker), so nothing
// server-only travels with it.
import { PUSH_CATEGORIES, type PushCategory } from "@/lib/push/categories";

export { PUSH_CATEGORIES, type PushCategory };

export const pushSubscriptions = mysqlTable(
  "pushSubscriptions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    // B5: NULLABLE. A push endpoint is anonymous by nature — it needs no user
    // id, no email and no OAuth — and the standing rule is that the app keeps
    // working with no account. Requiring a user here would have made the
    // single most valuable engagement feature depend on the account system for
    // no technical reason. Note the consequence, handled in A5's deletion
    // plan: an anonymous subscription has no account to be deleted with, so
    // the only way to remove one is the settings toggle (which deletes by
    // endpoint) or the endpoint going stale.
    userId: varchar("userId", { length: 255 }),

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

/**
 * B5 — when to poke a device, and about what kind of thing.
 *
 * This table is the whole reason server-scheduled reminders are possible at
 * all without breaking §4.3. The server cannot know when anybody's prenatal
 * control is: appointments live inside `syncRecords.payload`, which it never
 * reads. So the DEVICE schedules: it says "poke this endpoint at 09:00
 * tomorrow, category recordatorios", and the service worker composes the
 * actual sentence locally from IndexedDB when the poke arrives.
 *
 * What the server therefore learns is a timestamp and a category — never what
 * the notification says, never which appointment it is about, never the week
 * the user is in.
 */
export const pushReminders = mysqlTable(
  "pushReminders",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    // Keyed by endpoint, not by user: an anonymous subscription schedules
    // reminders exactly like a signed-in one.
    endpoint: varchar("endpoint", { length: 512 }).notNull(),
    category: mysqlEnum("category", PUSH_CATEGORIES).notNull(),
    /** Epoch ms, device-chosen. The only thing the server knows about it. */
    fireAt: bigint("fireAt", { mode: "number" }).notNull(),
    sentAt: bigint("sentAt", { mode: "number" }),
    createdAt: timestamp("createdAt", { mode: "date", fsp: 3 })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // The dispatch query: everything due and not yet sent.
    dueIdx: index("push_reminders_due_idx").on(table.fireAt, table.sentAt),
    endpointIdx: index("push_reminders_endpoint_idx").on(table.endpoint),
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
  companionSnapshots,
  companionTasks,
  companionCheers,
  photoBlobs,
  syncRecords,
  pushSubscriptions,
  pushReminders,
  aiGenerations,
  contentStats,
  adminAudit,
};
