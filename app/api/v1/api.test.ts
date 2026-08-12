import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as placementsGET } from "./placements/route";
import { GET as directoryGET } from "./directory/route";
import { GET as goGET } from "./go/[id]/route";

function req(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

// BUILD-PLAN J3 rewrote these. The whitelist used to be "these params and no
// others"; it is now "no params at all", so that the app can keep answering
// **"No data collected"** on the Play Data safety form
// (`docs/ANDROID-LAUNCH.md` §3.1). Every parameter these routes used to accept
// was either location-derived (`department`) or health-derived (`trimester`,
// `week`), and a health app that declares collection gets a heavier review.

/** Everything these routes used to take. None of it may be accepted now. */
const RETIRED_PARAMS = [
  "department=capital",
  "trimester=2",
  "week=24",
  "category=sanatorio",
  "q=sanatorio",
];

describe("/api/v1/placements takes no parameters (J3)", () => {
  it("rejects every parameter it used to accept", async () => {
    for (const param of RETIRED_PARAMS) {
      const res = await placementsGET(req(`/api/v1/placements?${param}`));
      expect(res.status, `${param} must be rejected`).toBe(400);
    }
  });

  it("rejects anything else too", async () => {
    const res = await placementsGET(req("/api/v1/placements?email=foo@bar.com"));
    expect(res.status).toBe(400);
  });

  it("returns every placement when asked for nothing", async () => {
    const res = await placementsGET(req("/api/v1/placements"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.placements)).toBe(true);
  });

  it("sets a cacheable, cookie-free response", async () => {
    const res = await placementsGET(req("/api/v1/placements"));
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });
});

describe("/api/v1/directory takes no parameters (J3)", () => {
  it("rejects every parameter it used to accept", async () => {
    for (const param of RETIRED_PARAMS) {
      const res = await directoryGET(req(`/api/v1/directory?${param}`));
      expect(res.status, `${param} must be rejected`).toBe(400);
    }
  });

  it("rejects anything else too", async () => {
    const res = await directoryGET(req("/api/v1/directory?phone=0981"));
    expect(res.status).toBe(400);
  });

  it("returns the full list, sponsored pinned on top", async () => {
    const res = await directoryGET(req("/api/v1/directory"));
    expect(res.status).toBe(200);
    const body = await res.json();

    let seenUnsponsored = false;
    for (const listing of body.listings as { isSponsored: boolean }[]) {
      if (!listing.isSponsored) seenUnsponsored = true;
      else expect(seenUnsponsored).toBe(false);
    }
  });
});

describe("/api/v1/go/[id] attribution is the id and nothing else (J3)", () => {
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  it("rejects the attribution parameters it used to accept", async () => {
    // These are the ones that made the Data safety answer a lie: trimester and
    // week are derived from the due date, department is a coarse location.
    for (const param of ["trimester=2", "department=capital", "week=24"]) {
      const res = await goGET(
        req(`/api/v1/go/anything?${param}`),
        params("anything"),
      );
      expect(res.status, `${param} must be rejected`).toBe(400);
    }
  });

  it("404s an unknown id rather than redirecting anywhere", async () => {
    const res = await goGET(
      req("/api/v1/go/no-such-listing"),
      params("no-such-listing"),
    );
    expect(res.status).toBe(404);
  });
});

describe("no route transmits a location- or health-derived parameter (J3)", () => {
  it("is asserted against the source of every caller", async () => {
    // The routes rejecting a parameter is only half of it: a client that keeps
    // appending one would then just break. This checks the other half — that
    // nothing in the app still builds such a URL.
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");

    function filesUnder(dir: string): string[] {
      return readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry);
        return statSync(full).isDirectory() ? filesUnder(full) : [full];
      });
    }

    const sources = [
      ...filesUnder(join(process.cwd(), "app")),
      ...filesUnder(join(process.cwd(), "components")),
    ].filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

    const offenders: string[] = [];
    for (const file of sources) {
      if (file.endsWith("api.test.ts")) continue;
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\/api\/v1\/(go\/[^"`'\s]*|directory[^"`'\s]*|placements[^"`'\s]*)/g)) {
        if (match[0].includes("?")) offenders.push(`${file}: ${match[0]}`);
      }
    }

    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
