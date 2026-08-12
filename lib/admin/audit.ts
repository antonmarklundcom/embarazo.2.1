// BUILD-PLAN A7 — the vocabulary of audited admin actions.
//
// Pure and dependency-free so it can be asserted in a unit test without
// dragging `lib/server/*` (and therefore next-auth) into the test runner.
// `lib/server/admin.ts` re-exports it, so callers still import one thing.

/**
 * Every mutating admin action. Adding one is a decision, not a detail:
 * ARCHITECTURE.md §9 requires each to write an `adminAudit` row, and a test
 * pins this list so a new action cannot appear without someone noticing.
 */
export const ADMIN_ACTIONS = [
  "user_viewed",
  "user_deleted",
  "invite_revoked",
  "invite_extended",
] as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[number];
