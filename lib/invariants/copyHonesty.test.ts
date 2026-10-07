import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// K6 and K18 — the claims this app is no longer allowed to make.
//
// K6 swept the "no te pedimos cuenta" and "nunca sale de tu teléfono" copy out
// of the screens. K18 found more of it, in the places a sweep of screens does
// not reach: `app/layout.tsx`'s metadata (the WhatsApp link preview — the most
// forwarded sentence the app has), `app/manifest.webmanifest`, the Diario
// header, the herramientas subtitle, a comment in `lib/sync/stores.ts`.
//
// The pattern is not carelessness. It is that a data-contract change (K1
// accounts, A3 sync, K4 photo backup) has a copy surface that nobody owns, and
// the sweep that fixes it is a one-off. This test is the thing that is not a
// one-off: the banned phrasings fail the build wherever they appear next.
//
// Conditional versions are explicitly fine, and that is the whole distinction:
// "sin cuenta, tus datos quedan en este teléfono" is true and useful. What is
// banned is the unconditional promise.

const ROOTS = ["app", "components", "lib"].map((dir) => join(process.cwd(), dir));

interface Hit {
  file: string;
  line: number;
  text: string;
}

function sourceLines(): { file: string; line: number; text: string }[] {
  const out: { file: string; line: number; text: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "node_modules") continue;
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|json|webmanifest|md)$/.test(entry)) continue;
      if (/\.test\.tsx?$/.test(entry)) continue;
      readFileSync(full, "utf8")
        .split("\n")
        .forEach((text, index) => {
          out.push({ file: full.replace(process.cwd() + "/", ""), line: index + 1, text });
        });
    }
  };
  for (const root of ROOTS) walk(root);
  // The two files outside those roots that K18 found claims in.
  for (const extra of ["app/manifest.webmanifest", "README.md"]) {
    readFileSync(join(process.cwd(), extra), "utf8")
      .split("\n")
      .forEach((text, index) => out.push({ file: extra, line: index + 1, text }));
  }
  return out;
}

const LINES = sourceLines();

/** Files whose prose (comments removed, whitespace and tags collapsed) matches. */
function claimsIn(pattern: RegExp): string[] {
  const byFile = new Map<string, string[]>();
  for (const { file, text } of LINES) {
    const trimmed = text.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
    byFile.set(file, [...(byFile.get(file) ?? []), text]);
  }
  return [...byFile]
    .filter(([, lines]) => pattern.test(lines.join(" ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ")))
    .map(([file]) => file);
}

function find(pattern: RegExp): Hit[] {
  return LINES.filter(({ text }) => pattern.test(text)).map((hit) => ({
    file: hit.file,
    line: hit.line,
    text: hit.text.trim().slice(0, 120),
  }));
}

describe("claims the app stopped being able to make", () => {
  it("never says we do not ask for an account", () => {
    // K1 made the account the front door. This is K6's grep, kept.
    expect(find(/no te pedimos cuenta/i)).toEqual([]);
  });

  it("never promises data stays on the phone without naming the condition", () => {
    // A3 syncs; the honest form names "sin cuenta". A line that says
    // "tus datos quedan en tu teléfono" with no condition on it is the one
    // that was on ten screens and in the link preview.
    const hits = find(/(?<!sin cuenta[^.]{0,40})datos quedan en tu tel[ée]fono/i)
      .filter((hit) => !hit.text.startsWith("//") && !hit.text.startsWith("*"));
    expect(hits).toEqual([]);
  });

  it("never says photos never leave the device", () => {
    // K4 made photo backup a real opt-in; the K6 addendum swept the six places
    // that said otherwise. This keeps the seventh from appearing.
    const hits = find(/fotos nunca (salen|se suben)/i).filter(
      (hit) => !hit.text.startsWith("//"),
    );
    expect(hits).toEqual([]);
  });

  it("F09: never says a synced record stays only on the phone", () => {
    // The 2026-10 review found the unconditional form on the screens of
    // stores that sync with an account (síntomas, checklists, calendario,
    // emergencia), and "nunca se suben" on the photo diary after K4. Both
    // are fine with their condition named; without it they are false.
    const hits = find(
      /(queda|quedan|se guarda|guardados?) solo en (tu|este) tel[ée]fono|nunca se suben|viajan cifradas/i,
    ).filter(
      (hit) =>
        !hit.text.startsWith("//") &&
        !hit.text.startsWith("*") &&
        !hit.text.startsWith("{/*") &&
        !/sin cuenta|Quedan solo en este teléfono\. Se borran/i.test(hit.text),
    );
    expect(hits).toEqual([]);
  });

  it("never claims a medical review or a data flow that does not exist", () => {
    // /terminos said "revisado por nuestro equipo médico" while every page
    // says no reviewer exists yet; a named reviewer is shown where one does.
    // The trimester/department were stripped from /directory long ago
    // (app/api/v1/directory/route.ts rejects every parameter). JSX wraps
    // sentences across lines, so this reads whole files, not lines.
    expect(
      claimsIn(/revisado por nuestro equipo m[ée]dico|(env[ií]ando|viaja al servidor)[^.]{0,80}trimestre/i),
    ).toEqual([]);
  });

  it("F09: offers no switch for sharing photos, which nobody can see", () => {
    const source = readFileSync(join(process.cwd(), "components/SharingLevels.tsx"), "utf8");
    expect(source).not.toMatch(/Va a verlas|no salen de tu teléfono/);
  });

  it("has removed the WordPress hook that never existed", () => {
    // K18: three `if (WP_API_URL)` branches that fell through to the seed data
    // regardless. Dead code shaped like a feature.
    const hits = find(/process\.env\.WP_API_URL/);
    expect(hits).toEqual([]);
  });
});
