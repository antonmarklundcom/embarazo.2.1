import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as placementsGET } from "./placements/route";
import { GET as directoryGET } from "./directory/route";

function req(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

describe("/api/v1/placements param whitelist (privacy boundary)", () => {
  it("rejects params outside the whitelist with 400", async () => {
    const res = await placementsGET(req("/api/v1/placements?email=foo@bar.com"));
    expect(res.status).toBe(400);
  });
  it("rejects an invalid department with 400", async () => {
    const res = await placementsGET(req("/api/v1/placements?department=narnia"));
    expect(res.status).toBe(400);
  });
  it("accepts trimester + department and returns placements", async () => {
    const res = await placementsGET(
      req("/api/v1/placements?trimester=2&department=capital"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.placements)).toBe(true);
    // Only trimester 2 or 0 (all) placements come back.
    for (const p of body.placements) {
      expect([0, 2]).toContain(p.trimester);
    }
  });
  it("sets a cacheable, cookie-free response", async () => {
    const res = await placementsGET(req("/api/v1/placements?trimester=1"));
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });
});

describe("/api/v1/directory param whitelist (privacy boundary)", () => {
  it("rejects params outside the whitelist with 400", async () => {
    const res = await directoryGET(req("/api/v1/directory?phone=0981"));
    expect(res.status).toBe(400);
  });
  it("rejects an invalid category with 400", async () => {
    const res = await directoryGET(req("/api/v1/directory?category=peluqueria"));
    expect(res.status).toBe(400);
  });
  it("filters by department + category", async () => {
    const res = await directoryGET(
      req("/api/v1/directory?department=capital&category=sanatorio"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const l of body.listings) {
      expect(l.department).toBe("capital");
      expect(l.category).toBe("sanatorio");
    }
  });
  it("pins sponsored listings on top", async () => {
    const res = await directoryGET(req("/api/v1/directory?department=capital"));
    const body = await res.json();
    const sponsoredFlags = body.listings.map((l: { isSponsored: boolean }) => l.isSponsored);
    // Once we hit a non-sponsored entry, no sponsored entry may follow.
    let seenUnsponsored = false;
    for (const flag of sponsoredFlags) {
      if (!flag) seenUnsponsored = true;
      else expect(seenUnsponsored).toBe(false);
    }
  });
});
