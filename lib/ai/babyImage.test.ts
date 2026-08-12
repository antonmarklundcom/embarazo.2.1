import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ACCEPTED_MIME,
  AI_BABY_CONSENT_POINTS,
  AI_BABY_LABEL,
  AI_BABY_PROMPT,
  MAX_PHOTO_BYTES,
  aiBabyCostMicros,
  aiBabyModel,
  isAiBabyEnabled,
  validatePhotos,
} from "./babyImage";

// BUILD-PLAN F1. The three non-negotiables from ARCHITECTURE.md §10 —
// the key never reaches the client, photos are not retained, one env var kills
// the feature — are asserted here, two of them against the source, because
// they are properties of the code rather than of any single function's output.

const KEY = { GEMINI_API_KEY: "secret", AI_BABY_ENABLED: "true" };

describe("the kill switch", () => {
  it("fails closed when unset", () => {
    expect(isAiBabyEnabled({})).toBe(false);
  });

  it("needs the flag AND the key", () => {
    expect(isAiBabyEnabled({ GEMINI_API_KEY: "secret" })).toBe(false);
    expect(isAiBabyEnabled({ AI_BABY_ENABLED: "true" })).toBe(false);
    expect(isAiBabyEnabled(KEY)).toBe(true);
  });

  it("treats anything other than 'true' as off", () => {
    // A flag that accepts "1" or "yes" is a flag someone turns on by accident.
    for (const value of ["1", "yes", "TRUE", "on", ""]) {
      expect(isAiBabyEnabled({ ...KEY, AI_BABY_ENABLED: value })).toBe(false);
    }
  });
});

describe("configuration", () => {
  it("defaults the model and cost, and lets env override both", () => {
    expect(aiBabyModel({})).toContain("gemini");
    expect(aiBabyModel({ AI_BABY_MODEL: "other" })).toBe("other");
    // ≈$0.04 at the ≤1024px tier (BUILD-PLAN Phase F), which moves.
    expect(aiBabyCostMicros({})).toBe(40_000);
    expect(aiBabyCostMicros({ AI_BABY_COST_MICROS: "13000" })).toBe(13_000);
    expect(aiBabyCostMicros({ AI_BABY_COST_MICROS: "nonsense" })).toBe(40_000);
  });
});

describe("validatePhotos", () => {
  const ok = { mimeType: "image/jpeg", data: "aaaa" };

  it("accepts one or two photos", () => {
    expect(validatePhotos([ok])).toBeNull();
    expect(validatePhotos([ok, ok])).toBeNull();
  });

  it("rejects none or three", () => {
    expect(validatePhotos([])).toBe("wrong-count");
    expect(validatePhotos([ok, ok, ok])).toBe("wrong-count");
  });

  it("rejects a non-image", () => {
    expect(validatePhotos([{ mimeType: "application/pdf", data: "aa" }])).toBe(
      "wrong-type",
    );
    for (const mime of ACCEPTED_MIME) {
      expect(validatePhotos([{ mimeType: mime, data: "aa" }])).toBeNull();
    }
  });

  it("rejects an oversized photo", () => {
    const big = { mimeType: "image/png", data: "a".repeat(MAX_PHOTO_BYTES * 2) };
    expect(validatePhotos([big])).toBe("too-big");
  });

  it("rejects an empty one", () => {
    expect(validatePhotos([{ mimeType: "image/png", data: "" }])).toBe("empty");
  });
});

describe("the prompt carries no personal data", () => {
  it("mentions no name, week, date or nickname placeholder", () => {
    // A template invites someone to interpolate the baby's nickname, and then
    // the prompt itself is personal data being sent to a third party.
    expect(AI_BABY_PROMPT).not.toMatch(/\$\{|\{\{|%s/);
    expect(AI_BABY_PROMPT.toLowerCase()).not.toContain("semana");
    expect(AI_BABY_PROMPT.toLowerCase()).not.toContain("name of");
  });
});

describe("the result is labelled entertainment", () => {
  it("says it is not a prediction", () => {
    const label = AI_BABY_LABEL.toLowerCase();
    expect(label).toContain("inteligencia artificial");
    expect(label).toContain("predicción");
    expect(label).toContain("juego");
  });

  it("names what is sent and that it is not kept", () => {
    const text = AI_BABY_CONSENT_POINTS.join(" ").toLowerCase();
    expect(text).toContain("no guardamos las fotos");
    expect(text).toContain("google");
    expect(text).toContain("tu teléfono");
  });
});

// ---------------------------------------------------------------------------
// Properties of the code, asserted against the source
// ---------------------------------------------------------------------------

function read(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

describe("the API key never reaches the client (§10)", () => {
  it("is read only in a server-only module", () => {
    const serverModule = read("lib", "server", "aiBaby.ts");
    expect(serverModule.startsWith('import "server-only"')).toBe(true);
    expect(serverModule).toContain("process.env.GEMINI_API_KEY");
  });

  it("is never read by a module a client component can import", () => {
    // `lib/ai/babyImage.ts` IS imported by client components, and it does name
    // GEMINI_API_KEY — as a key of an env bag passed in as an argument, the
    // same shape lib/auth/config.ts uses. What must never appear there is a
    // direct `process.env` read: that is what would inline a value into the
    // bundle. (Next only exposes NEXT_PUBLIC_* to the client, so the read
    // would yield undefined rather than the key — but "it happens to be safe"
    // is not the property worth relying on.)
    expect(read("lib", "ai", "babyImage.ts")).not.toContain("process.env");
    expect(read("app", "api", "v1", "ai", "baby", "route.ts")).not.toContain(
      "GEMINI_API_KEY",
    );
  });

  it("is sent as a header, not a query string", () => {
    // Query strings end up in access logs and proxy caches, and this one is a
    // live credential.
    const source = read("lib", "server", "aiBaby.ts");
    expect(source).toContain("x-goog-api-key");
    expect(source).not.toMatch(/[?&]key=/);
  });
});

describe("parent photos are not retained (§10)", () => {
  it("is never written to the database", () => {
    const source = read("lib", "server", "aiBaby.ts");
    // The only insert in this file is the aiGenerations bookkeeping row. If a
    // photo were ever stored, it would have to appear in a values() call.
    const inserts = source.match(/\.values\(\{[\s\S]*?\}\)/g) ?? [];
    expect(inserts.length).toBeGreaterThan(0);
    for (const insert of inserts) {
      for (const forbidden of ["photo", "image", "data", "prompt", "inline"]) {
        expect(
          insert.toLowerCase().includes(forbidden),
          `an insert in aiBaby.ts must not carry "${forbidden}"`,
        ).toBe(false);
      }
    }
  });

  it("does not log the request", () => {
    // An upstream error message can quote the request, and the request
    // contains someone's face.
    const source = read("lib", "server", "aiBaby.ts");
    expect(source).not.toContain("console.");
  });
});
