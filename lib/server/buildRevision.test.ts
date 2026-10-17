import { describe, expect, it } from "vitest";

import {
  BUILD_ENV_NAMES,
  envShortSha,
  gitShortSha,
  resolveBuildRevision,
  type GitRunner,
} from "./buildRevision";
import { resetRevisionCacheForTests, resolveRevision } from "./revision";

const SHA = "80b1830a1b2c3d4e5f60718293a4b5c6d7e8f901";
const OTHER = "1234567fedcba9876543210fedcba9876543210f";

const gitSays =
  (out: string): GitRunner =>
  () =>
    out;
const gitFails: GitRunner = () => {
  throw new Error("git: not found");
};

describe("gitShortSha", () => {
  it("asks git for HEAD in the project folder and shortens to seven", () => {
    let seen: { args: string[]; cwd: string } | undefined;
    const run: GitRunner = (args, cwd) => {
      seen = { args, cwd };
      return "80b1830\n";
    };
    expect(gitShortSha("/app", run)).toBe("80b1830");
    expect(seen).toEqual({ args: ["rev-parse", "--short=7", "HEAD"], cwd: "/app" });
  });

  it("shortens a longer abbreviation and rejects anything that is not a sha", () => {
    expect(gitShortSha("/app", gitSays(`${SHA}\n`))).toBe("80b1830");
    expect(gitShortSha("/app", gitSays("fatal: not a git repository\n"))).toBeNull();
    expect(gitShortSha("/app", gitSays(""))).toBeNull();
  });

  it("is null when git itself fails", () => {
    expect(gitShortSha("/app", gitFails)).toBeNull();
  });
});

describe("envShortSha", () => {
  it("tries the CI names in order and shortens to seven", () => {
    expect(BUILD_ENV_NAMES.slice(0, 4)).toEqual([
      "GITHUB_SHA",
      "SOURCE_COMMIT",
      "COMMIT_SHA",
      "VERCEL_GIT_COMMIT_SHA",
    ]);
    expect(envShortSha({ GITHUB_SHA: SHA, SOURCE_COMMIT: OTHER })).toBe("80b1830");
    expect(envShortSha({ SOURCE_COMMIT: OTHER, COMMIT_SHA: SHA })).toBe("1234567");
    expect(envShortSha({ COMMIT_SHA: SHA, VERCEL_GIT_COMMIT_SHA: OTHER })).toBe("80b1830");
    expect(envShortSha({ VERCEL_GIT_COMMIT_SHA: OTHER })).toBe("1234567");
  });

  it("skips values that are not a commit and moves to the next name", () => {
    expect(envShortSha({ GITHUB_SHA: "not-a-sha", SOURCE_COMMIT: OTHER })).toBe("1234567");
    expect(envShortSha({ GITHUB_SHA: "abc12", COMMIT_SHA: "$(rm -rf /)" })).toBeNull();
    expect(envShortSha({})).toBeNull();
  });
});

describe("resolveBuildRevision: git, then CI env vars, then unknown", () => {
  it("prefers git over the environment", () => {
    expect(resolveBuildRevision("/app", { GITHUB_SHA: OTHER }, gitSays(`${SHA}\n`))).toBe("80b1830");
  });

  it("falls back to the CI env vars when git is missing or fails", () => {
    expect(resolveBuildRevision("/app", { GITHUB_SHA: OTHER }, gitFails)).toBe("1234567");
    expect(
      resolveBuildRevision("/app", { SOURCE_COMMIT: SHA }, gitSays("fatal: not a git repository")),
    ).toBe("80b1830");
  });

  it("is unknown when neither has anything, and never throws", () => {
    expect(resolveBuildRevision("/app", {}, gitFails)).toBe("unknown");
    expect(resolveBuildRevision("/app", { GITHUB_SHA: "zzz" }, gitFails)).toBe("unknown");
  });

  it("works against the real git binary and always returns seven hex or unknown", () => {
    expect(resolveBuildRevision(process.cwd(), {})).toMatch(/^([0-9a-f]{7}|unknown)$/);
    expect(resolveBuildRevision("/definitely/not/a/folder", {})).toBe("unknown");
  });
});

describe("the baked build revision wins at runtime", () => {
  it("resolveRevision uses BUILD_REVISION before .git and CI env vars", () => {
    expect(resolveRevision("/nowhere", { BUILD_REVISION: SHA, GIT_COMMIT: OTHER })).toBe("80b1830");
  });

  it("falls through when the baked value is 'unknown' or missing", () => {
    expect(resolveRevision("/nowhere", { BUILD_REVISION: "unknown", GIT_COMMIT: OTHER })).toBe(
      "1234567",
    );
    expect(resolveRevision("/nowhere", {})).toBe("unknown");
    resetRevisionCacheForTests();
  });
});

describe("GET /api/v1/health", () => {
  it("returns exactly ok and revision, and nothing else", async () => {
    const { GET } = await import("@/app/api/v1/health/route");
    const response = GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["ok", "revision"]);
    expect(body.ok).toBe(true);
    expect(body.revision).toMatch(/^([0-9a-f]{7}|unknown)$/);
  });
});
