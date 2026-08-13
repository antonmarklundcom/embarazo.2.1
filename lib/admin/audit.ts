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

// ---------------------------------------------------------------------------
// The shape of `meta` (August 2026 review follow-up)
// ---------------------------------------------------------------------------
//
// `adminAudit` is the one table A5's deletion deliberately retains, which makes
// it the one place where a careless `meta: { ... }` outlives the user it
// describes. It was free-form json: nothing stopped a future action from
// putting an email, a symptom count or a note excerpt in there, and nothing
// would have failed.
//
// So the vocabulary of actions now comes with a vocabulary of payloads, in the
// same shape E1 uses for companion fields: an allowed list, a forbidden list,
// and a test that asserts both against the source rather than against a comment.

import { z } from "zod";

/** How many rows deletion removed, per table — metadata about the deletion. */
const DeletionCountsSchema = z.record(z.string(), z.number().int().min(0));

/**
 * What each action may record. `.strict()` everywhere: an unexpected key is a
 * rejected write, not a stored surprise.
 */
export const AUDIT_META_SCHEMAS = {
  // Reading a user's support page records who looked, not what they saw.
  user_viewed: z.object({}).strict(),
  user_deleted: z.object({ counts: DeletionCountsSchema }).strict(),
  invite_revoked: z.object({ code: z.string().min(1).max(32) }).strict(),
  invite_extended: z
    .object({ code: z.string().min(1).max(32), days: z.number().int().positive() })
    .strict(),
} as const satisfies Record<AdminAction, z.ZodType>;

/**
 * Keys that must never appear in an audit payload, whatever the action.
 *
 * The admin panel cannot read health content (A7), so none of these *can* be
 * populated today. The list exists for the same reason
 * `FORBIDDEN_COMPANION_FIELDS` does: it makes the next person's mistake a
 * failing test instead of a permanent row.
 */
export const FORBIDDEN_AUDIT_META_FIELDS = [
  "payload",
  "note",
  "notes",
  "photo",
  "symptom",
  "symptoms",
  "week",
  "dueDate",
  "lmpDate",
  "email",
  "phone",
  "name",
  "ip",
] as const;

export type AuditMeta<A extends AdminAction> = z.infer<(typeof AUDIT_META_SCHEMAS)[A]>;

/**
 * Validate a payload for an action.
 *
 * Throws rather than dropping the row: every mutating action must be audited
 * (§9), so "the audit failed" may not become "the audit is missing". Callers
 * build `meta` from literals, so a throw here is a programming error caught by
 * a test, not a runtime surprise for an administrator.
 */
export function parseAuditMeta(
  action: AdminAction,
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const result = AUDIT_META_SCHEMAS[action].safeParse(meta ?? {});
  if (!result.success) {
    throw new Error(
      `adminAudit.meta inválido para "${action}": ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "(raíz)"} ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data as Record<string, unknown>;
}
