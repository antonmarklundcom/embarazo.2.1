import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { APP_DESCRIPTOR, APP_NAME, APP_SHORT_NAME, APP_TITLE } from "./brand";

// U8 — one source of truth for the brand strings. Confirmed by Anton
// 2026-09-16 (docs/decisions-needed.md): "Mi Bebé · Embarazo Paraguay".

describe("the brand constants", () => {
  it("match the founder's confirmed name", () => {
    expect(APP_NAME).toBe("Mi Bebé");
    expect(APP_DESCRIPTOR).toBe("Embarazo Paraguay");
    expect(APP_TITLE).toBe("Mi Bebé · Embarazo Paraguay");
    expect(APP_SHORT_NAME).toBe("Mi Bebé");
  });
});

// `app/manifest.webmanifest` is a static asset — it cannot import this
// module — so this reads the file and asserts the two fields that must never
// drift from the constants above.
describe("the manifest, which can't import lib/brand.ts", () => {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "app", "manifest.webmanifest"), "utf8"),
  );

  it("names the app with the full title", () => {
    expect(manifest.name).toBe(APP_TITLE);
  });

  it("gives the home-screen icon the short name", () => {
    expect(manifest.short_name).toBe(APP_SHORT_NAME);
  });
});

// A source scan, in the shape of `lib/invariants/copyHonesty.test.ts`: the
// property that matters is not any one file being right today, it's that a
// future hardcoded "Mi Bebé" fails the build instead of quietly drifting from
// lib/brand.ts.
describe("no hardcoded brand literal outside lib/brand.ts", () => {
  const ROOTS = ["app", "components"].map((dir) => join(process.cwd(), dir));

  function tsxFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "node_modules") continue;
        out.push(...tsxFiles(full));
        continue;
      }
      if (entry.endsWith(".tsx")) out.push(full);
    }
    return out;
  }

  it('has no ".tsx" file under app/ or components/ containing "Mi Bebé"', () => {
    const hits: string[] = [];
    for (const root of ROOTS) {
      for (const file of tsxFiles(root)) {
        const source = readFileSync(file, "utf8");
        if (source.includes("Mi Bebé")) {
          hits.push(file.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", ""));
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
