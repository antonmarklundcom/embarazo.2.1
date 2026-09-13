// The Codex dispatch files under prompts/codex/ are piped through a Windows
// cmd wrapper that breaks on double quotes and truncates multi-line argv
// prompts (manager-worker-codex skill, references/codex-cli.md). This pins
// the one property that would silently corrupt a dispatch.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "prompts", "codex");

describe("prompts/codex dispatch files", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".txt"));

  it("exist", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s contains no double-quote characters", (file) => {
    const text = readFileSync(join(dir, file), "utf8");
    expect(text.includes('"')).toBe(false);
  });

  it.each(files)("%s carries the required sections", (file) => {
    const text = readFileSync(join(dir, file), "utf8");
    for (const heading of ["Tier:", "Task:", "Definition of done:", "Report format:"]) {
      expect(text, `${file} lacks ${heading}`).toContain(heading);
    }
  });
});
