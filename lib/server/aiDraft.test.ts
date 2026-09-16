import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  draftAvailability,
  generateDraft,
  utcDayStart,
  type DraftAuditStore,
  type DraftModel,
} from "./aiDraft";

// U9. Same shape as `lib/server/aiBaby.test.ts`: the store is in-memory so the
// cap logic is checked against real counting rather than a mock's call count,
// and the model is never reached — a stub takes its place.

const KEY = { GEMINI_API_KEY: "secret", AI_DRAFT_ENABLED: "true" };

function memoryStore(seed: Date[] = []): DraftAuditStore & { rows: Date[] } {
  const rows = [...seed];
  return {
    rows,
    async countSince(since) {
      return rows.filter((at) => at.getTime() >= since.getTime()).length;
    },
    async record() {
      rows.push(new Date());
    },
  };
}

const stubModel: DraftModel = async () => "Un borrador de prueba.";
const failingModel: DraftModel = async () => {
  throw new Error("upstream boom");
};

describe("the kill switch, fail-closed", () => {
  it("refuses with no key or flag configured, without touching the store", async () => {
    const original = { ...process.env };
    delete process.env.AI_DRAFT_ENABLED;
    delete process.env.GEMINI_API_KEY;
    try {
      const store = memoryStore();
      const result = await generateDraft(
        store,
        "admin-1",
        "q-1",
        "¿Es normal tener náuseas?",
        stubModel,
      );
      expect(result).toEqual({ ok: false, failure: "disabled" });
      // A refused-before-configured request writes nothing: the same
      // "nothing was spent" property `generateBabyImage` keeps for `disabled`.
      expect(store.rows).toHaveLength(0);
    } finally {
      process.env = original;
    }
  });

  it("refuses when only the flag is set", async () => {
    const original = { ...process.env };
    process.env.AI_DRAFT_ENABLED = "true";
    delete process.env.GEMINI_API_KEY;
    try {
      const result = await generateDraft(
        memoryStore(),
        "admin-1",
        "q-1",
        "¿Es normal?",
        stubModel,
      );
      expect(result).toEqual({ ok: false, failure: "disabled" });
    } finally {
      process.env = original;
    }
  });

  it("refuses when only the key is set", async () => {
    const original = { ...process.env };
    process.env.GEMINI_API_KEY = "secret";
    delete process.env.AI_DRAFT_ENABLED;
    try {
      const result = await generateDraft(
        memoryStore(),
        "admin-1",
        "q-1",
        "¿Es normal?",
        stubModel,
      );
      expect(result).toEqual({ ok: false, failure: "disabled" });
    } finally {
      process.env = original;
    }
  });

  it("draftAvailability reports 'disabled' the same way, before any query", async () => {
    const original = { ...process.env };
    delete process.env.AI_DRAFT_ENABLED;
    delete process.env.GEMINI_API_KEY;
    try {
      const store = memoryStore();
      expect(await draftAvailability(store)).toEqual({
        available: false,
        reason: "disabled",
      });
    } finally {
      process.env = original;
    }
  });
});

describe("when configured", () => {
  async function withKey<T>(fn: () => Promise<T>): Promise<T> {
    const original = { ...process.env };
    Object.assign(process.env, KEY);
    delete process.env.AI_DRAFT_DAILY_CAP;
    try {
      return await fn();
    } finally {
      process.env = original;
    }
  }

  it("generates and sanitises a draft, and records one audit row", async () =>
    withKey(async () => {
      const store = memoryStore();
      const markdownModel: DraftModel = async () => "**Hola**, mirá /emergencia.";
      const result = await generateDraft(
        store,
        "admin-1",
        "q-1",
        "¿Qué hago si sangro?",
        markdownModel,
      );
      expect(result).toEqual({ ok: true, draft: "Hola, mirá /emergencia." });
      expect(store.rows).toHaveLength(1);
    }));

  it("still records the attempt when the model throws", async () =>
    withKey(async () => {
      const store = memoryStore();
      const result = await generateDraft(
        store,
        "admin-1",
        "q-1",
        "¿Es normal?",
        failingModel,
      );
      expect(result).toEqual({ ok: false, failure: "no-draft" });
      // "written before the model call so a crash still counts" — the row is
      // there even though the call itself failed.
      expect(store.rows).toHaveLength(1);
    }));

  it("refuses once the daily cap is reached, before writing another row", async () =>
    withKey(async () => {
      process.env.AI_DRAFT_DAILY_CAP = "2";
      const now = new Date("2026-09-16T10:00:00Z");
      const store = memoryStore([
        new Date("2026-09-16T01:00:00Z"),
        new Date("2026-09-16T02:00:00Z"),
      ]);
      const result = await generateDraft(
        store,
        "admin-1",
        "q-2",
        "¿Es normal?",
        stubModel,
        now,
      );
      expect(result).toEqual({ ok: false, failure: "cap-reached" });
      expect(store.rows).toHaveLength(2);
    }));

  it("does not count yesterday's rows against today's cap", async () =>
    withKey(async () => {
      process.env.AI_DRAFT_DAILY_CAP = "1";
      const now = new Date("2026-09-16T10:00:00Z");
      const store = memoryStore([new Date("2026-09-15T23:59:00Z")]);
      const result = await generateDraft(
        store,
        "admin-1",
        "q-3",
        "¿Es normal?",
        stubModel,
        now,
      );
      expect(result.ok).toBe(true);
    }));

  it("draftAvailability reflects the same cap without generating anything", async () =>
    withKey(async () => {
      process.env.AI_DRAFT_DAILY_CAP = "1";
      const now = new Date("2026-09-16T10:00:00Z");
      const store = memoryStore([new Date("2026-09-16T01:00:00Z")]);
      expect(await draftAvailability(store, now)).toEqual({
        available: false,
        reason: "cap-reached",
      });
    }));
});

describe("utcDayStart", () => {
  it("is midnight UTC of the given day", () => {
    const start = utcDayStart(new Date("2026-09-16T23:59:59.999Z"));
    expect(start.toISOString()).toBe("2026-09-16T00:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// Nothing generated here ever reaches a user (spec, "Build" §1)
// ---------------------------------------------------------------------------

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  if (!statSync(dir, { throwIfNoEntry: false })) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function code(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("no user-facing surface can import lib/server/aiDraft", () => {
  const appGroup = join(process.cwd(), "app", "(app)");
  const apiV1 = join(process.cwd(), "app", "api", "v1");
  const sources = [...filesUnder(appGroup), ...filesUnder(apiV1)];

  it("scans a real, non-empty set of user-facing sources", () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it("names aiDraft nowhere under app/(app) or app/api/v1", () => {
    for (const path of sources) {
      expect(code(path), path).not.toMatch(/aiDraft/);
    }
  });
});

describe("the module never logs", () => {
  it("contains no console. call — an upstream error can quote a question", () => {
    const source = code(join(process.cwd(), "lib", "server", "aiDraft.ts"));
    expect(source).not.toContain("console.");
  });
});
