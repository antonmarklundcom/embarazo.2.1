import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

// Which source revision is this process running?
//
// Used by `GET /api/v1/health` so the owner (or an agent) can tell that a
// deployment has actually landed without hashing the JS chunk list. Only the
// first seven hex characters of the commit are ever returned: enough to match
// `git log --oneline`, nothing about branches, remotes or paths.
//
// Where the SHA comes from, in order:
//   1. `BUILD_REVISION`, baked into the bundle by `next.config.ts` at build time
//      (`lib/server/buildRevision.ts`: git, then CI env vars). This is the one
//      that works on a host that deploys the build without `.git`.
//   2. The repository itself: `.git/HEAD`, then the ref file it names, then
//      `packed-refs`. Works where the server runs next to a checkout.
//   3. `GIT_COMMIT`, `SOURCE_VERSION`, `VERCEL_GIT_COMMIT_SHA` — set by other
//      CI/hosts that run from an export without `.git`.
//   4. "unknown".
//
// `next build` with `output: "standalone"` runs the server from
// `.next/standalone`, so `process.cwd()` can be a subfolder of the checkout.
// The search therefore starts at `cwd` and walks up at most three parents.
// It only ever opens `<dir>/.git/HEAD`, `<dir>/.git/packed-refs` and one ref
// file that is validated to live under `<dir>/.git/refs/`; a worktree's `.git`
// *file* (a `gitdir:` pointer outside the tree) is deliberately not followed.
//
// Nothing here throws. A missing, unreadable or malformed file is "not found".

export const UNKNOWN_REVISION = "unknown";

const SHORT_LENGTH = 7;
const MAX_PARENTS = 3;
const FULL_SHA = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
// A ref name we are willing to turn into a path: no empty, dot or ".." parts.
const SAFE_REF = /^refs\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;

function shorten(sha: string): string {
  return sha.slice(0, SHORT_LENGTH);
}

/** A hex string of seven or more characters -> its first seven, else null. */
export function shortShaFrom(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return /^[0-9a-f]{7,64}$/.test(trimmed) ? shorten(trimmed) : null;
}

/** Whether `ref` is a plain `refs/...` name with no traversal in it. */
export function isSafeRef(ref: string): boolean {
  return SAFE_REF.test(ref) && !ref.split("/").some((part) => part === "." || part === "..");
}

/**
 * Pure parser. `head` is the text of `.git/HEAD`; `readRef` returns the text of
 * a loose ref file (or null); `packedRefs` is the text of `.git/packed-refs`
 * (or null). Returns the 7-character revision, or null when nothing parses.
 */
export function parseRevision(
  head: string | null,
  readRef: (ref: string) => string | null,
  packedRefs: string | null,
): string | null {
  if (head === null) return null;
  const line = head.trim();

  // Detached HEAD: the file is the commit itself.
  if (FULL_SHA.test(line)) return shorten(line);

  const match = /^ref:\s*(\S+)$/.exec(line);
  if (!match) return null;
  const ref = match[1] ?? "";
  if (!isSafeRef(ref)) return null;

  const loose = readRef(ref)?.trim();
  if (loose && FULL_SHA.test(loose)) return shorten(loose);

  if (packedRefs !== null) {
    for (const raw of packedRefs.split(/\r?\n/)) {
      // Skip the header ("# pack-refs with: ...") and peeled lines ("^<sha>").
      if (!raw || raw.startsWith("#") || raw.startsWith("^")) continue;
      const [sha, name] = raw.trim().split(/\s+/);
      if (sha && name === ref && FULL_SHA.test(sha)) return shorten(sha);
    }
  }
  return null;
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Read the revision from the `.git` directory directly inside `dir`. */
export function revisionFromGitDir(dir: string): string | null {
  const gitDir = join(dir, ".git");
  if (!isDirectory(gitDir)) return null;

  const refRoot = resolve(gitDir, "refs") + sep;
  return parseRevision(
    readText(join(gitDir, "HEAD")),
    (ref) => {
      const file = resolve(gitDir, ref);
      // Belt and braces on top of `isSafeRef`: never read outside .git/refs.
      return file.startsWith(refRoot) ? readText(file) : null;
    },
    readText(join(gitDir, "packed-refs")),
  );
}

/** `start` and up to three parents, nearest first. */
export function candidateDirs(start: string): string[] {
  const dirs: string[] = [];
  let current = resolve(start);
  for (let i = 0; i <= MAX_PARENTS; i += 1) {
    dirs.push(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return dirs;
}

/** Uncached resolution, for tests and for `getRevision`. Never throws. */
export function resolveRevision(
  cwd: string,
  env: Record<string, string | undefined>,
): string {
  // The value `next.config.ts` baked in at build time wins: it was resolved
  // where the checkout was, which is not where the server runs.
  const baked = shortShaFrom(env.BUILD_REVISION);
  if (baked) return baked;

  try {
    for (const dir of candidateDirs(cwd)) {
      const found = revisionFromGitDir(dir);
      if (found) return found;
    }
  } catch {
    // fall through to the environment
  }

  for (const name of ["GIT_COMMIT", "SOURCE_VERSION", "VERCEL_GIT_COMMIT_SHA"]) {
    const found = shortShaFrom(env[name]);
    if (found) return found;
  }
  return UNKNOWN_REVISION;
}

let cached: string | undefined;

/**
 * The deployed revision, read once per process. A new deployment is a new
 * process, so memoising never serves a stale answer.
 */
export function getRevision(): string {
  if (cached === undefined) {
    try {
      // `process.env.BUILD_REVISION` must stay a literal member access: Next's
      // `env` option replaces exactly that expression in the bundle.
      cached = resolveRevision(process.cwd(), {
        ...process.env,
        BUILD_REVISION: process.env.BUILD_REVISION,
      });
    } catch {
      cached = UNKNOWN_REVISION;
    }
  }
  return cached;
}

/** Test seam: forget the memoised value. */
export function resetRevisionCacheForTests(): void {
  cached = undefined;
}
