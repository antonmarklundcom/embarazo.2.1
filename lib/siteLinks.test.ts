import { describe, expect, it } from "vitest";
import { ARTICLES } from "./seed/articles";
import { GUIDE_TO_SITE_PATH, siteGuideUrl, siteUrl, siteWeekUrl } from "./siteLinks";

describe("siteLinks", () => {
  it("defaults to embarazo.com.py and trims a trailing slash from env", () => {
    expect(siteUrl({})).toBe("https://embarazo.com.py");
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://staging.example.py/" })).toBe(
      "https://staging.example.py",
    );
  });

  it("builds trailing-slash week and guide URLs", () => {
    expect(siteWeekUrl(20, {})).toBe("https://embarazo.com.py/semana/20/");
    expect(siteGuideUrl("senales-de-alarma-embarazo", {})).toBe(
      "https://embarazo.com.py/salud/senales-de-alarma/",
    );
    expect(siteGuideUrl("no-such-guide", {})).toBeNull();
  });

  it("maps only guides that exist in the app seed", () => {
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    for (const slug of Object.keys(GUIDE_TO_SITE_PATH)) expect(slugs.has(slug)).toBe(true);
  });
});
