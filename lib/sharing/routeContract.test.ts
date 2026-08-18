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
    // One `.strict()` per action object in the discriminated union.
    expect(union.match(/\.strict\(\)/g)?.length).toBe(
      union.match(/action: z\.literal/g)?.length,
    );
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
    const fn = SERVER.slice(SERVER.indexOf("export async function sendCheer"));
    const body = fn.slice(0, fn.indexOf("\n}"));
    expect(body).toContain("liveMembership");
    // An owner cheering herself is not a thing the product does.
    expect(body).toContain('membership.role === "owner"');
  });
});

describe("family is excluded by the server, not by the UI", () => {
  it("gates the task list on canSeeSharedTasks inside the read", () => {
    const fn = SERVER.slice(SERVER.indexOf("export async function readTasksFor"));
    const body = fn.slice(0, fn.indexOf("\n}"));
    expect(body).toContain("liveMembership");
    expect(body).toContain("canSeeSharedTasks");
    // Null, not []: "there is nothing assigned" is itself an answer, and a
    // family member is not entitled to it.
    expect(body).toMatch(/canSeeSharedTasks\(membership\.role\)\) return null/);
  });

  it("gates the cheer inbox on being the owner inside the read", () => {
    const fn = SERVER.slice(SERVER.indexOf("export async function readCheersFor"));
    const body = fn.slice(0, fn.indexOf("\n}"));
    expect(body).toContain("liveMembership");
    expect(body).toMatch(/membership\.role !== "owner"/);
  });
});
