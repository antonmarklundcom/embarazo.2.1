import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  candidateDirs,
  getRevision,
  isSafeRef,
  parseRevision,
  resetRevisionCacheForTests,
  resolveRevision,
  shortShaFrom,
} from "./revision";

const SHA = "80b1830a1b2c3d4e5f60718293a4b5c6d7e8f901";
const OTHER = "1234567fedcba9876543210fedcba9876543210f";
const none = () => null;

describe("parseRevision", () => {
  it("follows HEAD to a loose ref", () => {
    const read = (ref: string) => (ref === "refs/heads/main" ? `${SHA}\n` : null);
    expect(parseRevision("ref: refs/heads/main\n", read, null)).toBe("80b1830");
  });

  it("reads a detached HEAD directly", () => {
    expect(parseRevision(`${SHA}\n`, none, null)).toBe("80b1830");
  });

  it("falls back to packed-refs when the loose ref is missing", () => {
    const packed = [
      "# pack-refs with: peeled fully-peeled sorted",
      `${OTHER} refs/heads/other`,
      `${SHA} refs/heads/main`,
      `^${OTHER}`,
      "",
    ].join("\n");
    expect(parseRevision("ref: refs/heads/main", none, packed)).toBe("80b1830");
  });

  it("returns null for garbage, missing files and unsafe refs", () => {
    expect(parseRevision(null, none, null)).toBeNull();
    expect(parseRevision("", none, null)).toBeNull();
    expect(parseRevision("not a head file", none, null)).toBeNull();
    expect(parseRevision("ref: refs/heads/main", () => "garbage", "garbage")).toBeNull();
    expect(parseRevision("ref: refs/heads/main", none, null)).toBeNull();
    expect(parseRevision("ref: ../../etc/passwd", () => SHA, null)).toBeNull();
    expect(parseRevision("ref: refs/../../secret", () => SHA, null)).toBeNull();
    expect(parseRevision("ref: /etc/passwd", () => SHA, null)).toBeNull();
    expect(parseRevision(`${SHA.slice(0, 39)}g`, none, null)).toBeNull();
  });
});

describe("helpers", () => {
  it("shortShaFrom accepts only hex of seven or more characters", () => {
    expect(shortShaFrom("ABCDEF1234567")).toBe("abcdef1");
    expect(shortShaFrom("abc12")).toBeNull();
    expect(shortShaFrom("not-a-sha!")).toBeNull();
    expect(shortShaFrom(undefined)).toBeNull();
    expect(shortShaFrom(1234567)).toBeNull();
  });

  it("isSafeRef rejects traversal", () => {
    expect(isSafeRef("refs/heads/feature/x")).toBe(true);
    expect(isSafeRef("refs/heads/../x")).toBe(false);
    expect(isSafeRef("HEAD")).toBe(false);
  });

  it("candidateDirs is the start plus at most three parents", () => {
    const dirs = candidateDirs(join(tmpdir(), "a", "b", "c", "d", "e"));
    expect(dirs).toHaveLength(4);
  });
});

describe("resolveRevision on disk", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "revision-test-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function gitDirWith(files: Record<string, string>): void {
    for (const [name, text] of Object.entries(files)) {
      const file = join(root, ".git", name);
      mkdirSync(join(file, ".."), { recursive: true });
      writeFileSync(file, text);
    }
  }

  it("reads HEAD and a loose ref", () => {
    gitDirWith({ HEAD: "ref: refs/heads/main\n", "refs/heads/main": `${SHA}\n` });
    expect(resolveRevision(root, {})).toBe("80b1830");
  });

  it("finds the checkout from .next/standalone, up to three levels", () => {
    gitDirWith({ HEAD: `${SHA}\n` });
    const standalone = join(root, ".next", "standalone");
    mkdirSync(standalone, { recursive: true });
    expect(resolveRevision(standalone, {})).toBe("80b1830");
    const tooDeep = join(root, "a", "b", "c", "d");
    mkdirSync(tooDeep, { recursive: true });
    expect(resolveRevision(tooDeep, {})).toBe("unknown");
  });

  it("uses CI env vars when there is no .git, in order", () => {
    expect(resolveRevision(root, { SOURCE_VERSION: OTHER, GIT_COMMIT: SHA })).toBe("80b1830");
    expect(resolveRevision(root, { SOURCE_VERSION: OTHER })).toBe("1234567");
    expect(resolveRevision(root, { VERCEL_GIT_COMMIT_SHA: SHA })).toBe("80b1830");
  });

  it("is unknown for garbage everywhere, and ignores a non-hex env value", () => {
    gitDirWith({ HEAD: "garbage" });
    expect(resolveRevision(root, { GIT_COMMIT: "$(rm -rf /)" })).toBe("unknown");
  });

  it("does not follow a .git file (worktree pointer) or a hostile ref", () => {
    writeFileSync(join(root, ".git"), "gitdir: /somewhere/else\n");
    expect(resolveRevision(root, {})).toBe("unknown");
  });

  it("never throws and always returns seven hex characters or unknown", () => {
    for (const cwd of [root, join(root, "missing"), ""]) {
      expect(resolveRevision(cwd, {})).toMatch(/^([0-9a-f]{7}|unknown)$/);
    }
  });
});

describe("getRevision", () => {
  afterEach(() => resetRevisionCacheForTests());

  it("memoises the answer", () => {
    resetRevisionCacheForTests();
    const first = getRevision();
    expect(first).toMatch(/^([0-9a-f]{7}|unknown)$/);
    expect(getRevision()).toBe(first);
  });
});
