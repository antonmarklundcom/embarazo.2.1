import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { APP_SHORT_NAME, APP_TITLE } from "./brand";

// android/twa-manifest.json is the Bubblewrap config for the Play wrapper
// (android/README.md). It is plain JSON that cannot import anything, so this
// keeps it in step with the web manifest and the brand constants. A drift here
// ships a Play app whose splash, colours or name disagree with the site.

const read = (...parts: string[]) => JSON.parse(readFileSync(join(process.cwd(), ...parts), "utf8"));
const twa = read("android", "twa-manifest.json");
const web = read("app", "manifest.webmanifest");

describe("the Play wrapper config", () => {
  it("uses the brand names", () => {
    expect(twa.name).toBe(APP_TITLE);
    expect(twa.launcherName).toBe(APP_SHORT_NAME);
  });

  it("matches the web manifest's colours, display and orientation", () => {
    expect(twa.themeColor).toBe(web.theme_color);
    expect(twa.backgroundColor).toBe(web.background_color);
    expect(twa.display).toBe(web.display);
    expect(twa.orientation).toBe(web.orientation);
    expect(twa.startUrl).toBe(web.start_url);
  });

  it("points at the production app origin and its icons", () => {
    expect(twa.host).toBe("app.embarazo.com.py");
    expect(twa.fullScopeUrl).toBe(`https://${twa.host}/`);
    expect(twa.webManifestUrl).toBe(`https://${twa.host}/manifest.webmanifest`);
    const iconPaths = web.icons.map((icon: { src: string }) => icon.src);
    expect(iconPaths).toContain(new URL(twa.iconUrl).pathname);
    expect(iconPaths).toContain(new URL(twa.maskableIconUrl).pathname);
  });

  it("enables notifications, which cannot be added without a new Play release", () => {
    expect(twa.enableNotifications).toBe(true);
  });

  it("uses the package name the assetlinks route documents", () => {
    expect(twa.packageId).toBe("py.com.embarazo.app");
    const route = readFileSync(join(process.cwd(), "app", "api", "assetlinks", "route.ts"), "utf8");
    expect(route).toContain(`TWA_PACKAGE_NAME=${twa.packageId}`);
  });

  it("has a positive integer version code", () => {
    expect(Number.isInteger(twa.appVersionCode)).toBe(true);
    expect(twa.appVersionCode).toBeGreaterThan(0);
  });
});
