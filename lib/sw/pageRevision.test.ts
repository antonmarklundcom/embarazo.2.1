import { describe, expect, it } from "vitest";

import { pageRevision, revisionedPages } from "./pageRevision";

describe("pageRevision", () => {
  const build1 = [
    { url: "/_next/static/AAA/_buildManifest.js", revision: "r1" },
    { url: "/_next/static/chunks/app-111.js", revision: null },
  ];
  const build2 = [
    { url: "/_next/static/BBB/_buildManifest.js", revision: "r1" },
    { url: "/_next/static/chunks/app-222.js", revision: null },
  ];

  it("is stable for the same manifest", () => {
    expect(pageRevision(build1)).toBe(pageRevision([...build1]));
  });

  it("changes when the build id or a chunk changes", () => {
    expect(pageRevision(build1)).not.toBe(pageRevision(build2));
    expect(pageRevision(build1)).not.toBe(pageRevision([build1[0]!, { url: "/_next/static/chunks/app-112.js", revision: null }]));
  });

  it("revisions every page route with the same value", () => {
    const pages = revisionedPages(["/", "/guias"], build1);
    expect(pages).toEqual([
      { url: "/", revision: pageRevision(build1) },
      { url: "/guias", revision: pageRevision(build1) },
    ]);
    expect(pages[0]!.revision.length).toBeGreaterThan(0);
  });
});
