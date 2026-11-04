import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { isPublicAppPath } from "@/lib/auth/access";

// Night run items 5–6: what the app tells crawlers and installers.

const manifest = JSON.parse(readFileSync(join(process.cwd(), "app", "manifest.webmanifest"), "utf8"));
const twa = JSON.parse(readFileSync(join(process.cwd(), "android", "twa-manifest.json"), "utf8"));

describe("sitemap", () => {
  it("lists only pages a signed-out crawler can open", () => {
    for (const entry of sitemap()) {
      const path = new URL(entry.url).pathname;
      expect(isPublicAppPath(path), path).toBe(true);
    }
  });

  it("falls back to the production origin, never the old placeholder", () => {
    const urls = sitemap().map((e) => e.url);
    for (const url of urls) expect(url).not.toContain("mibebe.app");
    expect(String(robots().sitemap)).not.toContain("mibebe.app");
  });
});

describe("web manifest", () => {
  it("has a stable id and keeps one window", () => {
    expect(manifest.id).toBe("/");
    expect(manifest.launch_handler).toEqual({ client_mode: "navigate-existing" });
    expect(manifest.prefer_related_applications).toBe(false);
  });

  it("offers four shortcuts to routes that exist, mirrored in the Play wrapper", () => {
    const urls = manifest.shortcuts.map((s: { url: string }) => s.url);
    expect(urls).toEqual(["/semana", "/herramientas/pataditas", "/herramientas/contracciones", "/emergencia"]);
    for (const url of urls) {
      const dir = join(process.cwd(), "app", "(app)", ...url.split("/").filter(Boolean), "page.tsx");
      expect(() => readFileSync(dir), url).not.toThrow();
    }
    expect(twa.shortcuts.map((s: { url: string }) => s.url)).toEqual(urls);
  });

  it("carries a wide screenshot for the desktop install sheet", () => {
    const wide = manifest.screenshots.filter((s: { form_factor: string }) => s.form_factor === "wide");
    expect(wide.length).toBeGreaterThan(0);
    for (const shot of manifest.screenshots) {
      expect(() => readFileSync(join(process.cwd(), "public", shot.src))).not.toThrow();
    }
  });
});
