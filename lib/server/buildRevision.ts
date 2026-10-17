import { execFileSync } from "node:child_process";

import { shortShaFrom, UNKNOWN_REVISION } from "./revision";

// Which source revision is this BUILD made from?
//
// `GET /api/v1/health` used to read `.git` when the server started. On
// Hostinger the app is deployed without `.git`, so it answered "unknown". The
// build runs where the checkout is, so `next.config.ts` resolves the revision
// here, once, and bakes it into the server bundle through its `env` option
// (`BUILD_REVISION`). `lib/server/revision.ts` reads that baked value first.
//
// Order, first hit wins:
//   1. `git rev-parse --short=7 HEAD` in the project folder.
//   2. A commit SHA a CI or host puts in the environment (names below).
//   3. "unknown".
//
// This file is imported by `next.config.ts`, so it uses a relative import (no
// `@/` alias there) and never throws: a missing git binary, a folder with no
// repository and a hostile env value all come out as "not found".

/** Env vars that carry the commit being built, in the order they are tried. */
export const BUILD_ENV_NAMES = [
  "GITHUB_SHA",
  "SOURCE_COMMIT",
  "COMMIT_SHA",
  "VERCEL_GIT_COMMIT_SHA",
  "GIT_COMMIT",
  "SOURCE_VERSION",
] as const;

/** Runs `git` with these arguments in `cwd` and returns its stdout. May throw. */
export type GitRunner = (args: string[], cwd: string) => string;

const runGit: GitRunner = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    // Never inherit stdin and never print git's complaints into the build log.
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 5000,
  });

/** The seven-character HEAD of the repository at `cwd`, or null. Never throws. */
export function gitShortSha(cwd: string, run: GitRunner = runGit): string | null {
  try {
    return shortShaFrom(run(["rev-parse", "--short=7", "HEAD"], cwd));
  } catch {
    return null;
  }
}

/** The first usable commit SHA in `env`, shortened to seven characters. */
export function envShortSha(env: Record<string, string | undefined>): string | null {
  for (const name of BUILD_ENV_NAMES) {
    const found = shortShaFrom(env[name]);
    if (found) return found;
  }
  return null;
}

/** git, then CI env vars, then "unknown". Never throws. */
export function resolveBuildRevision(
  cwd: string,
  env: Record<string, string | undefined>,
  run: GitRunner = runGit,
): string {
  return gitShortSha(cwd, run) ?? envShortSha(env) ?? UNKNOWN_REVISION;
}
