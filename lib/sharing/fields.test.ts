import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { FORBIDDEN_SHARED_FIELDS } from "./levels";
import {
  COMPANION_FIELDS,
  FORBIDDEN_COMPANION_FIELDS,
  FORBIDDEN_TASK_FIELDS,
  INVITE_CODE_LENGTH,
  MEMBER_ROLES,
  SHARED_TASK_KEYS,
  buildSnapshot,
  canCompleteSharedTask,
  canSeeSharedTasks,
  canWrite,
  isSharedTaskKey,
  generateInviteCode,
  isLiveMembership,
  isValidInviteCode,
  snapshotShouldBeDropped,
  type CompanionSnapshot,
} from "./fields";

// BUILD-PLAN E1: "an invited partner sees the week, due date and next
// appointment and nothing else; revoking access is immediate."
//
// The first half is asserted twice — once against the snapshot shape, and once
// against the database schema, because a field can only reach a companion if
// it has somewhere to live.

describe("roles", () => {
  it("matches the documented set", () => {
    expect(MEMBER_ROLES).toEqual(["owner", "partner", "family"]);
  });

  it("gives write access to the owner and nobody else", () => {
    expect(canWrite("owner")).toBe(true);
    expect(canWrite("partner")).toBe(false);
    expect(canWrite("family")).toBe(false);
  });
});

describe("K2 — shared checklist items", () => {
  it("is the first thing partner can do and family cannot", () => {
    // E1 kept the two roles separate precisely so this could be a permission
    // change instead of a migration. This is that change.
    expect(canSeeSharedTasks("owner")).toBe(true);
    expect(canSeeSharedTasks("partner")).toBe(true);
    expect(canSeeSharedTasks("family")).toBe(false);
  });

  it("lets only the pareja tick one off — the owner assigns, she is not the doer", () => {
    expect(canCompleteSharedTask("partner")).toBe(true);
    expect(canCompleteSharedTask("owner")).toBe(false);
    expect(canCompleteSharedTask("family")).toBe(false);
  });

  it("accepts exactly the app's own checklist keys", () => {
    expect(SHARED_TASK_KEYS.length).toBeGreaterThan(10);
    expect(new Set(SHARED_TASK_KEYS).size).toBe(SHARED_TASK_KEYS.length);
    for (const key of SHARED_TASK_KEYS) expect(isSharedTaskKey(key)).toBe(true);
  });

  it("refuses anything that is not one of them, prose above all", () => {
    for (const value of [
      "",
      "bolso-que-no-existe",
      "Traé el carné y avisale a mi mamá",
      "'; DROP TABLE companionTasks;--",
      null,
      undefined,
      7,
      ["bolso-carne"],
    ]) {
      expect(isSharedTaskKey(value), JSON.stringify(value)).toBe(false);
    }
  });

  it("has nowhere in the database to put a note either", () => {
    const schema = readFileSync(
      join(process.cwd(), "lib", "server", "schema.ts"),
      "utf8",
    );
    const table = schema.slice(
      schema.indexOf("export const companionTasks"),
      schema.indexOf("export const companionCheers"),
    );
    expect(table.length).toBeGreaterThan(50);
    for (const forbidden of FORBIDDEN_TASK_FIELDS) {
      expect(
        table.includes(`"${forbidden}"`),
        `companionTasks must have no "${forbidden}" column`,
      ).toBe(false);
    }
  });
});

describe("what a companion can see", () => {
  it("is week, due date, next appointment and the baby's name", () => {
    expect([...COMPANION_FIELDS].sort()).toEqual(
      ["babyName", "dueDate", "nextAppointmentAt", "updatedAt", "week"].sort(),
    );
  });

  it("never carries a note, a symptom, a photo or a measurement", () => {
    const snapshot = buildSnapshot({
      week: 24,
      dueDate: 1_800_000_000_000,
      nextAppointmentAt: 1_700_000_000_000,
      babyName: "Silvia",
      now: 1_690_000_000_000,
    });
    const keys = Object.keys(snapshot).map((k) => k.toLowerCase());
    for (const forbidden of FORBIDDEN_COMPANION_FIELDS) {
      expect(
        keys.some((k) => k.includes(forbidden.toLowerCase())),
        `a companion snapshot must never carry "${forbidden}"`,
      ).toBe(false);
    }
  });

  it("has nowhere in the database to put a forbidden field either", () => {
    // The schema is the real boundary: a filter can be forgotten, a missing
    // column cannot. This reads the table definition rather than trusting that
    // the write path is careful.
    //
    // K3 amended this deliberately: `weight`/`kg` are on E1's forbidden list
    // because nothing could ever share them, and K3 makes them shareable under
    // an explicit, per-field, partner-only opt-in. So this scan runs over the
    // list *minus* those two (`FORBIDDEN_SHARED_FIELDS`), and the stronger
    // assertion — that the table holds EXACTLY the columns the whitelists
    // claim and nothing else — lives in `levels.test.ts`.
    const schema = readFileSync(
      join(process.cwd(), "lib", "server", "schema.ts"),
      "utf8",
    );
    const table = schema.slice(
      schema.indexOf("companionSnapshots = mysqlTable"),
      schema.indexOf("export const companionTasks"),
    );
    expect(table.length).toBeGreaterThan(50);

    for (const forbidden of FORBIDDEN_SHARED_FIELDS) {
      expect(
        table.includes(`"${forbidden}"`),
        `companionSnapshots must have no "${forbidden}" column`,
      ).toBe(false);
    }
  });
});

describe("buildSnapshot", () => {
  const base = {
    week: 24,
    dueDate: 1_800_000_000_000,
    nextAppointmentAt: null,
    babyName: null,
    now: 1_690_000_000_000,
  };

  it("carries exactly the whitelisted keys", () => {
    expect(Object.keys(buildSnapshot(base)).sort()).toEqual(
      [...COMPANION_FIELDS].sort(),
    );
  });

  it("normalises a blank nickname to null", () => {
    // Otherwise the companion view renders an empty name instead of falling
    // back to "tu bebé".
    expect(buildSnapshot({ ...base, babyName: "   " }).babyName).toBeNull();
    expect(buildSnapshot({ ...base, babyName: " Silvia " }).babyName).toBe(
      "Silvia",
    );
  });

  it("passes nulls through rather than inventing values", () => {
    const snapshot: CompanionSnapshot = buildSnapshot({
      ...base,
      week: null,
      dueDate: null,
    });
    expect(snapshot.week).toBeNull();
    expect(snapshot.dueDate).toBeNull();
  });
});

describe("revocation", () => {
  it("is immediate — a revoked membership is not live", () => {
    expect(isLiveMembership({ revokedAt: null })).toBe(true);
    expect(isLiveMembership({})).toBe(true);
    expect(isLiveMembership({ revokedAt: new Date() })).toBe(false);
    expect(isLiveMembership({ revokedAt: 1 })).toBe(false);
  });
});

describe("invite codes", () => {
  it("avoids characters that get misread over the phone", () => {
    // These codes get read aloud and written down.
    for (let i = 0; i < 200; i += 1) {
      const code = generateInviteCode();
      expect(code).toHaveLength(INVITE_CODE_LENGTH);
      expect(code).not.toMatch(/[0O1IL]/);
      expect(isValidInviteCode(code)).toBe(true);
    }
  });

  it("rejects a malformed code without hitting the database", () => {
    expect(isValidInviteCode("")).toBe(false);
    expect(isValidInviteCode("SHORT")).toBe(false);
    expect(isValidInviteCode("ABCDEFGHI0")).toBe(false);
    expect(isValidInviteCode("abcdefghij")).toBe(false);
  });

  it("has enough entropy that guessing is not a strategy", () => {
    // 31^10 ≈ 8.2e14. A pregnancy behind a guessable code is not acceptable.
    expect(31 ** INVITE_CODE_LENGTH).toBeGreaterThan(1e14);
  });
});


describe("the snapshot does not outlive the last companion", () => {
  it("is dropped when the last non-owner membership is revoked", () => {
    expect(snapshotShouldBeDropped(0)).toBe(true);
  });

  it("survives while anyone else still has access", () => {
    expect(snapshotShouldBeDropped(1)).toBe(false);
    expect(snapshotShouldBeDropped(2)).toBe(false);
  });

  it("is deleted by revokeMembership itself, not by a cleanup job", () => {
    // Asserted against the source for the same reason the field list is: this
    // is a property of the code path, and a cleanup that runs "later" is a
    // window in which the row exists with nobody entitled to it.
    const source = readFileSync(
      join(process.cwd(), "lib", "server", "sharing.ts"),
      "utf8",
    );
    const fn = source.slice(source.indexOf("export async function revokeMembership"));
    const body = fn.slice(0, fn.indexOf("\n}"));
    expect(body).toContain("snapshotShouldBeDropped");
    expect(body).toContain(".delete(companionSnapshots)");
  });
});
