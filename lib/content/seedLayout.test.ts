import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { LEGACY_ROOT_SEED_FILES, seedLayoutProblems } from "./seedLayout";

// docs/CONTENT-COUNTRY-RULE.md section 2: where a seed JSON file may live.

const repoRoot = path.resolve(import.meta.dirname, "../..");

function seedJsonPaths(dir = "lib/seed"): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(repoRoot, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...seedJsonPaths(rel));
    else if (entry.name.endsWith(".json")) out.push(rel);
  }
  return out;
}

const fromMap = (files: Record<string, unknown>) => (p: string) => {
  if (!(p in files)) throw new Error(`no file ${p}`);
  return files[p];
};

const ok = { lang: "es-PY", items: [] };

describe("seedLayoutProblems", () => {
  it("accepts the frozen legacy files directly under lib/seed/", () => {
    const paths = LEGACY_ROOT_SEED_FILES.map((name) => `lib/seed/${name}`);
    expect(seedLayoutProblems(paths, () => [])).toEqual([]);
  });

  it("rejects a new file directly under lib/seed/ and names the folders and the rule", () => {
    const problems = seedLayoutProblems(["lib/seed/nuevo.json"], () => ok);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("lib/seed/nuevo.json");
    expect(problems[0]).toContain("lib/seed/shared/");
    expect(problems[0]).toContain("lib/seed/py/");
    expect(problems[0]).toContain("docs/CONTENT-COUNTRY-RULE.md");
  });

  it("accepts well-formed files in shared/ and py/, nested too", () => {
    const files = {
      "lib/seed/shared/hitos.json": ok,
      "lib/seed/py/tramites.json": { lang: "es-PY", items: [{ id: "a" }] },
      "lib/seed/py/ips/centros.json": ok,
    };
    expect(seedLayoutProblems(Object.keys(files), fromMap(files))).toEqual([]);
  });

  it("rejects a list instead of an object", () => {
    const files = { "lib/seed/shared/lista.json": [1, 2] };
    const problems = seedLayoutProblems(Object.keys(files), fromMap(files));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("lib/seed/shared/lista.json");
    expect(problems[0]).toContain("objeto");
  });

  it("rejects a missing or wrong lang", () => {
    const files = {
      "lib/seed/py/sin-lang.json": { items: [] },
      "lib/seed/py/otro-lang.json": { lang: "es-AR", items: [] },
    };
    const problems = seedLayoutProblems(Object.keys(files), fromMap(files));
    expect(problems).toHaveLength(2);
    for (const line of problems) expect(line).toContain('campo "lang"');
    expect(problems.join("\n")).toContain("sin-lang.json");
    expect(problems.join("\n")).toContain("otro-lang.json");
  });

  it("rejects missing or non-array items", () => {
    const files = {
      "lib/seed/shared/sin-items.json": { lang: "es-PY" },
      "lib/seed/shared/items-objeto.json": { lang: "es-PY", items: {} },
    };
    const problems = seedLayoutProblems(Object.keys(files), fromMap(files));
    expect(problems).toHaveLength(2);
    for (const line of problems) expect(line).toContain('campo "items"');
  });

  it("reports a file that cannot be read", () => {
    const problems = seedLayoutProblems(["lib/seed/py/roto.json"], () => {
      throw new SyntaxError("Unexpected token");
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("lib/seed/py/roto.json");
  });

  it("rejects a JSON file in an unknown subfolder", () => {
    const problems = seedLayoutProblems(["lib/seed/ar/x.json"], () => ok);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("carpeta desconocida");
    expect(problems[0]).toContain("lib/seed/ar/");
  });

  it("treats folders that do not exist (no paths) as fine", () => {
    expect(seedLayoutProblems([], () => ok)).toEqual([]);
  });

  it("accepts Windows separators", () => {
    expect(seedLayoutProblems(["lib\\seed\\nuevo.json"], () => ok)).toHaveLength(1);
  });

  it("finds no problems in the real lib/seed/", () => {
    const read = (p: string) => JSON.parse(readFileSync(path.join(repoRoot, p), "utf8"));
    expect(seedLayoutProblems(seedJsonPaths(), read)).toEqual([]);
  });

  it("names only legacy files that still exist, sorted", () => {
    const missing = LEGACY_ROOT_SEED_FILES.filter(
      (name) => !existsSync(path.join(repoRoot, "lib/seed", name)),
    );
    expect(missing).toEqual([]);
    expect([...LEGACY_ROOT_SEED_FILES]).toEqual([...LEGACY_ROOT_SEED_FILES].sort());
  });
});
