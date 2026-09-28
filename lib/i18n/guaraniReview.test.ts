import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { DICT } from "./dict";
import { ALARM_SIGNS, CALL_SCRIPT_STEPS } from "@/lib/emergency";
import { BENEFITS } from "@/lib/derechos";
import { CHEERS } from "@/lib/sharing/cheers";

// K19 — the review sheet is committed, so it can drift. This is what stops it.
//
// The failure mode is specific and bad: a reviewer sits down with
// `docs/GUARANI-REVIEW.md`, signs off on 78 phrases, and three of them are not
// what the app ships any more — so a string nobody read goes out under a
// review that appears to cover it. Same argument as the article index: a
// generated file that is committed has to be pinned to its source.

const SHEET = join(process.cwd(), "docs", "GUARANI-REVIEW.md");

function sheet(): string {
  return readFileSync(SHEET, "utf8");
}

describe("docs/GUARANI-REVIEW.md", () => {
  it("is regenerated from the source, byte for byte", () => {
    // Runs the generator; it writes only on change, so a clean tree means the
    // committed sheet already matches.
    const before = sheet();
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "scripts/gen-guarani-review.mts"],
      { cwd: process.cwd(), stdio: "pipe" },
    );
    expect(
      sheet(),
      "docs/GUARANI-REVIEW.md is stale — run `npm run gen:guarani-review` and commit it",
    ).toBe(before);
  });

  it("carries every Guaraní string the app can show", () => {
    const text = sheet();
    const expected = [
      ...ALARM_SIGNS.map((s) => s.text.gn),
      ...CALL_SCRIPT_STEPS.map((s) => s.gn),
      ...BENEFITS.map((b) => b.title.gn),
      // `CHEERS` is `as const`, so two entries have no `gn` in the type at
      // all — which is the point (see the sheet's section 5).
      ...CHEERS.map((c) => ("gn" in c.text ? c.text.gn : undefined)),
      ...Object.values(DICT.gn),
    ].filter((value): value is string => Boolean(value));

    for (const phrase of expected) {
      expect(text, `missing from the review sheet: ${phrase}`).toContain(phrase);
    }
  });

  it("counts what it says it counts", () => {
    const rows = sheet()
      .split("\n")
      .filter((line) => /^\| \d+ \| /.test(line)).length;
    const header = /\*\*(\d+) frases\*\*/.exec(sheet());
    expect(header, "the sheet must state its own total").not.toBeNull();
    expect(rows).toBe(Number(header![1]));
  });

  it("tells the reviewer the register is jopara", () => {
    // The one instruction that changes the output most: without it a reviewer
    // "corrects" everyday speech into academic Guaraní nobody recognises.
    expect(sheet()).toMatch(/jopara/i);
  });
});

// Growth plan item 20b — every Guaraní string the code holds is on the sheet,
// not only the ones the generator was told about. A `gn:` added to a new file
// would otherwise ship (the day the `guarani` flag is on) without a reviewer
// ever seeing it.
describe("coverage of the review sheet", () => {
  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
      else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
    }
    return out;
  }

  it("lists every `gn:` string literal in lib/, components/ and app/", () => {
    const text = sheet();
    const missing: string[] = [];
    let found = 0;
    for (const dir of ["lib", "components", "app"]) {
      for (const file of sourceFiles(join(process.cwd(), dir))) {
        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(/\bgn:\s*("(?:[^"\\]|\\.)*")/g)) {
          const value = JSON.parse(match[1]!) as string;
          found += 1;
          if (!text.includes(value)) missing.push(`${file}: ${value}`);
        }
      }
    }
    expect(found).toBeGreaterThan(20);
    expect(missing).toEqual([]);
  });

  it("lists every Guaraní word of the core dictionary", () => {
    const text = sheet();
    const missing = Object.values(DICT.gn).filter((value) => !text.includes(value));
    expect(missing).toEqual([]);
  });
});
