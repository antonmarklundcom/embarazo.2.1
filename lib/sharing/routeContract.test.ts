import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// BUILD-PLAN K2 — properties of `/api/v1/sharing` asserted against its source.
//
// The handler imports `lib/server/auth.ts`, and therefore next-auth, which does
// not load under vitest's node environment. Its *behaviour* is driven end to
// end in `e2e/companion.spec.ts` against a stubbed server, the same way A3
// tested the sync wire. What is checked here is the set of properties that are
// true of the code rather than of any one call — the kind a passing behavioural
// test would not notice being removed.

const ROUTE = readFileSync(
  join(process.cwd(), "app", "api", "v1", "sharing", "route.ts"),
  "utf8",
);

const SERVER = readFileSync(
  join(process.cwd(), "lib", "server", "sharing.ts"),
  "utf8",
);

/**
 * The source of one exported function, from its signature to the next export.
 *
 * Slicing at the first `\n}` looks simpler and is wrong: a function whose
 * return type is a multi-line object literal closes that literal on a line
 * starting with `}`, so the "body" ends before the code does and every
 * assertion about it silently passes.
 */
function fnBody(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`);
  expect(start, `${name} not found`).toBeGreaterThan(-1);
  const rest = source.slice(start);
  const next = rest.indexOf("\nexport ", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("the route accepts ids, never prose", () => {
  it("validates every K2 item key against the app's own checklist keys", () => {
    // `z.string()` here would be the whole feature quietly becoming a free-text
    // channel into somebody else's database row.
    expect(ROUTE).toContain("itemKey: z.enum(TASK_KEYS)");
    expect(ROUTE).not.toMatch(/itemKey:\s*z\.string/);
    expect(ROUTE).toContain("SHARED_TASK_KEYS");
  });

  it("validates every cheer against the pinned list", () => {
    expect(ROUTE).toContain("cheerId: z.enum(CHEER_ID_VALUES)");
    expect(ROUTE).not.toMatch(/cheerId:\s*z\.string/);
    expect(ROUTE).toContain("CHEER_IDS");
  });

  it("has no free-text field anywhere in a K2 action", () => {
    // The named fields are the whole vocabulary: an action carrying a `text`,
    // `note` or `message` would be a moderation surface this app cannot staff.
    for (const forbidden of ["text:", "note:", "message:", "comment:", "label:"]) {
      expect(ROUTE.includes(forbidden), forbidden).toBe(false);
    }
  });

  it("keeps every action strict, so an extra key is a 400 and not a shrug", () => {
    const unionStart = ROUTE.indexOf("const ActionSchema");
    const unionEnd = ROUTE.indexOf("function unavailable");
    const union = ROUTE.slice(unionStart, unionEnd);
    // Every `z.object(` in the union — the actions themselves and K3's nested
    // `sharing` / `extras` — carries a `.strict()`. Counting objects rather
    // than actions is what keeps this honest as nested shapes get added: a
    // non-strict nested object is exactly as leaky as a non-strict action.
    const objects = union.match(/\.object\(/g)?.length ?? 0;
    expect(objects).toBeGreaterThanOrEqual(
      union.match(/action: z\.literal/g)?.length ?? 0,
    );
    expect(union.match(/\.strict\(\)/g)?.length).toBe(objects);
  });
});

describe("a companion acts on somebody else's pregnancy, and is checked for it", () => {
  it("handles the companion actions before ensurePregnancyForOwner", () => {
    // Otherwise a partner ticking off "llevá el carné" would silently acquire a
    // pregnancy of their own on the way through.
    const cheer = ROUTE.indexOf('data.action === "cheer"');
    const complete = ROUTE.indexOf('data.action === "complete-task"');
    const ensure = ROUTE.indexOf("await ensurePregnancyForOwner");
    expect(complete).toBeGreaterThan(-1);
    expect(cheer).toBeGreaterThan(-1);
    expect(ensure).toBeGreaterThan(-1);
    expect(complete).toBeLessThan(ensure);
    expect(cheer).toBeLessThan(ensure);
  });

  it("re-checks the membership on every companion write", () => {
    const block = ROUTE.slice(
      ROUTE.indexOf('data.action === "complete-task"'),
      ROUTE.indexOf("await ensurePregnancyForOwner"),
    );
    expect(block).toContain("liveMembership");
    expect(block).toContain("canCompleteSharedTask");
  });

  it("never lets a companion send a cheer without a live membership", () => {
    const body = fnBody(SERVER, "sendCheer");
    expect(body).toContain("liveMembership");
    // An owner cheering herself is not a thing the product does.
    expect(body).toContain('membership.role === "owner"');
  });
});

describe("K3 — the levels are applied by the server, not only by the device", () => {
  it("re-applies the levels on the way in", () => {
    // A client that sends a weight with `peso: false` — an old build, a bug, a
    // hand-rolled request — must store a null, not a value nobody agreed to
    // share. The device applying the levels first is a courtesy; this is the
    // rule.
    const body = fnBody(SERVER, "publishSnapshot");
    expect(body).toContain("applyLevels(preferences, extras)");
  });

  it("defaults an absent `sharing` block to everything off", () => {
    expect(ROUTE).toContain("data.sharing ?? SHARING_DEFAULTS");
    expect(ROUTE).toContain("data.extras ?? emptyExtras()");
  });

  it("bounds the values rather than storing whatever arrives", () => {
    const union = ROUTE.slice(
      ROUTE.indexOf("const ActionSchema"),
      ROUTE.indexOf("function unavailable"),
    );
    expect(union).toMatch(/weightGrams: z\.number\(\)\.int\(\)\.min\(/);
    expect(union).toMatch(/kickCount: z\.number\(\)\.int\(\)\.min\(/);
  });

  it("gates the extras on the role AND the stored flag, inside the read", () => {
    const body = fnBody(SERVER, "readSnapshotFor");
    // The role gate is the rule ("the pareja only, ever"); the flags are the
    // owner's choice. Reading the STORED flags is what makes switching a level
    // off take effect even if her device never publishes again.
    expect(body).toContain("canSeeSharingLevels(membership.role)");
    expect(body).toContain("applyLevels");
    expect(body).toContain("row.sharePeso");
    expect(body).toContain("row.sharePataditas");
  });
});

describe("K8 — the accompanying marker", () => {
  it("is set only by a live non-owner member", () => {
    const body = fnBody(SERVER, "setAccompanying");
    expect(body).toContain("liveMembership");
    // She is not accompanying herself.
    expect(body).toContain('membership.role === "owner"');
    // And a revoked membership cannot be written through.
    expect(body).toContain("isNull(pregnancyMembers.revokedAt)");
  });

  it("is handled before ensurePregnancyForOwner, like the other companion actions", () => {
    const accompany = ROUTE.indexOf('data.action === "accompany"');
    const ensure = ROUTE.indexOf("await ensurePregnancyForOwner");
    expect(accompany).toBeGreaterThan(-1);
    expect(accompany).toBeLessThan(ensure);
  });

  it("adds no health field to the wire — it is a timestamp and a pregnancy id", () => {
    const union = ROUTE.slice(
      ROUTE.indexOf("const ActionSchema"),
      ROUTE.indexOf("function unavailable"),
    );
    const accompany = union.slice(
      union.indexOf('action: z.literal("accompany")'),
    );
    const action = accompany.slice(0, accompany.indexOf(".strict()"));
    expect(action).toContain("appointmentAt: z.number().int().positive().nullable()");
    expect(action).toContain("pregnancyId:");
    // Nothing else. The appointment it points at is already shared with this
    // exact member via companionSnapshots, so K8 stores no new health data.
    // The slice starts after `action:`, so what remains is `pregnancyId` and
    // `appointmentAt` — and nothing else, which is the assertion.
    expect(action.match(/^\s+\w+:/gm)).toHaveLength(2);
  });
});

describe("family is excluded by the server, not by the UI", () => {
  it("gates the task list on canSeeSharedTasks inside the read", () => {
    const body = fnBody(SERVER, "readTasksFor");
    expect(body).toContain("liveMembership");
    expect(body).toContain("canSeeSharedTasks");
    // Null, not []: "there is nothing assigned" is itself an answer, and a
    // family member is not entitled to it.
    expect(body).toMatch(/canSeeSharedTasks\(membership\.role\)\) return null/);
  });

  it("gates the cheer inbox on being the owner inside the read", () => {
    const body = fnBody(SERVER, "readCheersFor");
    expect(body).toContain("liveMembership");
    expect(body).toMatch(/membership\.role !== "owner"/);
  });
});
