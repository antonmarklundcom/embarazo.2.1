import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// K20 — "rejected/pending questions never render publicly", asserted against
// the source rather than against a rendered page.
//
// The reason this is a source scan and not a rendering test: the failure mode
// is not "the page shows a pending question today". It is somebody widening a
// `where` clause, adding a `status` parameter, or reaching for
// `communityQuestions` directly from a new page, six months from now — at
// which point every existing rendering test still passes, because the fixtures
// they use have no pending rows in them.
//
// So this file pins the shape of the access instead: one function owns the
// public read, it filters in SQL, and nothing public selects the asker.

const ROOT = process.cwd();
const QUESTIONS = readFileSync(join(ROOT, "lib", "server", "questions.ts"), "utf8");
const PUBLIC_ROUTE = readFileSync(
  join(ROOT, "app", "api", "v1", "preguntas", "route.ts"),
  "utf8",
);
const OWN_ROUTE = readFileSync(
  join(ROOT, "app", "api", "v1", "mis-preguntas", "route.ts"),
  "utf8",
);
const COMPONENT = readFileSync(
  join(ROOT, "components", "CommunityQuestions.tsx"),
  "utf8",
);

/** The body of one exported function in lib/server/questions.ts. */
function functionSource(name: string): string {
  const start = QUESTIONS.indexOf(`export async function ${name}(`);
  if (start === -1) throw new Error(`${name} is not exported from questions.ts`);
  const next = QUESTIONS.indexOf("\nexport ", start + 1);
  return QUESTIONS.slice(start, next === -1 ? undefined : next);
}

describe("only approved, answered questions can be read publicly", () => {
  it("filters on status in SQL, not after the fetch", () => {
    // In SQL, because a `.filter()` afterwards is one refactor away from being
    // dropped for "performance" — and because a page that forgot to check the
    // status still cannot get a pending row out of this function.
    const source = functionSource("approvedQuestions");
    expect(source).toMatch(/where\(\s*eq\(communityQuestions\.status,\s*"approved"\)/);
  });

  it("never publishes a question whose answer is missing", () => {
    const source = functionSource("approvedQuestions");
    expect(source).toMatch(/answer\?\.trim\(\)\.length/);
  });

  it("does not select the asker on the public read", () => {
    // `askedByUserId` exists so she can see her own status and so deletion can
    // find the row. A published question has no author, and the way to keep it
    // that way is for the public projection to be unable to name one.
    const source = functionSource("approvedQuestions");
    expect(source).not.toMatch(/askedByUserId/);
  });

  it("keeps the public route free of any session read", () => {
    // K14's rule: a route that reads a session is NetworkOnly forever. The
    // public list must stay cacheable, so submitting and status-checking live
    // on `/api/v1/mis-preguntas` instead. `swCache.test.ts` enforces the other
    // half — that `mis-preguntas` IS covered by the NetworkOnly pattern.
    expect(PUBLIC_ROUTE).not.toMatch(/getSession|requireAdmin/);
    // No handler that could grow one, either — asserted on the export rather
    // than on the word, which the comment above this route uses to explain why
    // it is absent.
    expect(PUBLIC_ROUTE).not.toMatch(/export\s+(async\s+)?function\s+POST/);
  });

  it("scopes the private route to the session's own user, with no id from the wire", () => {
    // The one way this leaks somebody else's question is a userId that arrives
    // in the request. There is no such parameter, and there must not be.
    expect(OWN_ROUTE).toMatch(/session\?\.user\?\.id/);
    expect(OWN_ROUTE).not.toMatch(/searchParams\.get\(\s*["']userId/);
    expect(OWN_ROUTE).not.toMatch(/userId:\s*z\./);
  });

  it("takes only the question text from the submitter", () => {
    // `.strict()` on a one-key object: a body carrying `status: "approved"`
    // is a rejected request, not a published question.
    expect(OWN_ROUTE).toMatch(/z\s*\.object\(\{\s*question:\s*questionSchema\s*\}\)\s*\.strict\(\)/);
  });

  it("never renders an author on the public surface", () => {
    expect(COMPONENT).not.toMatch(/askedBy|authorName|\.author\b/);
  });
});

describe("the queue is the only path to publication", () => {
  it("writes status and answer together, so approved-without-answer never exists", () => {
    const source = functionSource("approveQuestion");
    expect(source).toMatch(/status:\s*"approved"/);
    expect(source).toMatch(/answer,/);
  });

  it("stores every submission as pending, whatever the request said", () => {
    const source = functionSource("submitQuestion");
    expect(source).toMatch(/status:\s*"pending"/);
  });

  it("keeps a rejected question unanswered rather than deleting it", () => {
    // She is told what happened. A question that silently disappears reads as
    // a bug, and she asks it again.
    const source = functionSource("rejectQuestion");
    expect(source).toMatch(/status:\s*"rejected"/);
    expect(source).not.toMatch(/\.delete\(/);
  });
});

describe("the admin panel's promise still holds", () => {
  // The "never names `payload`" scan lives in `lib/server/admin.test.ts`,
  // which globs every source under `app/admin` and strips comments before
  // matching. The new queue page is covered by it automatically — repeating
  // the assertion here would only add a second, weaker copy that trips over
  // its own prose.

  it("audits both decisions with the id alone", () => {
    // `adminAudit` is the one table deletion retains. A user's words must not
    // outlive her account by riding along in an audit payload.
    const actions = readFileSync(join(ROOT, "app", "admin", "actions.ts"), "utf8");
    expect(actions).toMatch(/action:\s*"question_approved"/);
    expect(actions).toMatch(/action:\s*"question_rejected"/);
    const metaBlocks = actions.match(/meta:\s*\{[^}]*questionId[^}]*\}/g) ?? [];
    expect(metaBlocks.length).toBe(2);
    for (const block of metaBlocks) {
      expect(block).not.toMatch(/question:|answer:/);
    }
  });
});
