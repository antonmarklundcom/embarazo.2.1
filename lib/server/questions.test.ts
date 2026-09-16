import { describe, expect, it } from "vitest";

import {
  approveQuestion,
  approvedQuestions,
  decidedQuestions,
  pendingQuestions,
  questionsOf,
  questionsTodayCount,
  rejectQuestion,
  submitQuestion,
} from "./questions";
import type { QuestionDecision, QuestionsBackend, StoredQuestion } from "./questionsBackend";
import { QUESTIONS_PER_DAY } from "@/lib/community/questions";

// K20, W5 — what the community Q&A queue decides, asserted.
//
// These run the real `lib/server/questions.ts` — the same functions the route
// and the admin actions call, unmodified — with a Map underneath instead of
// MySQL, exactly as A3's `sync.test.ts` runs the real `pushRecords` and V2's
// `sharing.test.ts` runs the real `sharing.ts`. `lib/invariants/
// publicQuestions.test.ts` still watches the SQL and the source shape; this
// file is about the decisions themselves.

function memoryBackend(): QuestionsBackend & { rows: Map<string, StoredQuestion> } {
  const rows = new Map<string, StoredQuestion>();
  let seq = 0;

  return {
    rows,

    async insert(row) {
      seq += 1;
      rows.set(row.id, {
        id: row.id,
        askedByUserId: row.askedByUserId,
        question: row.question,
        status: row.status,
        answer: null,
        answeredByUserId: null,
        // A distinct, increasing timestamp per insert, anchored to the real
        // clock rather than a fixed epoch — `questionsTodayCount` compares
        // against `Date.now()` by default, and a fixture far enough in the
        // past would silently never fall inside its trailing-24h window.
        createdAt: new Date(Date.now() + seq),
        decidedAt: null,
      });
    },

    async countSince(userId, since) {
      return [...rows.values()].filter(
        (row) => row.askedByUserId === userId && row.createdAt >= since,
      ).length;
    },

    async ofUser(userId, limit) {
      return [...rows.values()]
        .filter((row) => row.askedByUserId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },

    async approvedNewestFirst(limit) {
      // Mirrors the SQL: filtered on status here, in the backend, not by the
      // caller.
      return [...rows.values()]
        .filter((row) => row.status === "approved")
        .sort(
          (a, b) =>
            (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0) ||
            b.id.localeCompare(a.id),
        )
        .slice(0, limit);
    },

    async pending(limit) {
      return [...rows.values()]
        .filter((row) => row.status === "pending")
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, limit);
    },

    async decided(limit) {
      return [...rows.values()]
        .filter((row) => row.status === "approved")
        .sort((a, b) => (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0))
        .slice(0, limit);
    },

    async decide(id, fields: QuestionDecision) {
      const row = rows.get(id);
      if (!row) return false;
      row.status = fields.status;
      row.answeredByUserId = fields.answeredByUserId;
      row.decidedAt = fields.decidedAt;
      // Mirrors `.set(fields)`: a key the caller did not include is left
      // alone. A rejection does not carry `answer`, so it must not clear one.
      if ("answer" in fields) row.answer = fields.answer ?? null;
      return true;
    },
  };
}

const ASKER = "user-asker";
const OTHER = "user-other";
const ADMIN = "user-admin";

async function seedQuestion(
  backend: QuestionsBackend & { rows: Map<string, StoredQuestion> },
  id: string,
  askedByUserId: string,
): Promise<void> {
  await backend.insert({ id, askedByUserId, question: "¿Es normal?", status: "pending" });
}

describe("submitting a question", () => {
  it("stores it pending, under the asker's id", async () => {
    const backend = memoryBackend();

    const result = await submitQuestion(backend, ASKER, "¿Puedo comer papaya?");

    expect(result).toEqual({ ok: true, id: expect.any(String) });
    const stored = result.ok ? backend.rows.get(result.id) : undefined;
    expect(stored?.status).toBe("pending");
    expect(stored?.askedByUserId).toBe(ASKER);
  });

  it("refuses a fourth question in a day — the account cap, not the IP cap", async () => {
    const backend = memoryBackend();
    for (let i = 0; i < QUESTIONS_PER_DAY; i += 1) {
      await submitQuestion(backend, ASKER, `¿Pregunta número ${i}?`);
    }

    const result = await submitQuestion(backend, ASKER, "¿Una más?");

    expect(result).toEqual({ ok: false, reason: "rate_limited" });
    expect(backend.rows.size).toBe(QUESTIONS_PER_DAY);
  });

  it("does not let one account's cap block another's", async () => {
    const backend = memoryBackend();
    for (let i = 0; i < QUESTIONS_PER_DAY; i += 1) {
      await submitQuestion(backend, ASKER, `¿Pregunta número ${i}?`);
    }

    const result = await submitQuestion(backend, OTHER, "¿Puedo yo?");

    expect(result.ok).toBe(true);
  });

  it("only counts submissions inside the trailing 24 hours", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "old", ASKER);
    const oldRow = backend.rows.get("old")!;
    oldRow.createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000);

    expect(await questionsTodayCount(backend, ASKER)).toBe(0);
  });
});

describe("her own questions, and never anybody else's", () => {
  it("lists only what this account asked", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "mine-1", ASKER);
    await seedQuestion(backend, "mine-2", ASKER);
    await seedQuestion(backend, "theirs", OTHER);

    const mine = await questionsOf(backend, ASKER);

    expect(mine.map((q) => q.id).sort()).toEqual(["mine-1", "mine-2"]);
  });

  it("never returns another account's question, even by id order", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "theirs", OTHER);

    const mine = await questionsOf(backend, ASKER);

    expect(mine).toEqual([]);
  });

  it("carries the live status and answer, whatever it is", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "q1", ASKER);
    await approveQuestion(backend, "q1", ADMIN, "Sí, es normal.");

    const [mine] = await questionsOf(backend, ASKER);

    expect(mine).toMatchObject({ status: "approved", answer: "Sí, es normal." });
  });
});

describe("the public read", () => {
  it("shows an approved, answered question", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "q1", ASKER);
    await approveQuestion(backend, "q1", ADMIN, "Sí, es normal.");

    const list = await approvedQuestions(backend);

    expect(list).toEqual([
      { id: "q1", question: "¿Es normal?", answer: "Sí, es normal.", answeredAt: expect.any(String) },
    ]);
  });

  it("never shows a pending question", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "q1", ASKER);

    expect(await approvedQuestions(backend)).toEqual([]);
  });

  it("never shows a rejected question", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "q1", ASKER);
    await rejectQuestion(backend, "q1", ADMIN);

    expect(await approvedQuestions(backend)).toEqual([]);
  });

  it("never publishes an approved question with an empty answer", async () => {
    // The accidental form of "public unreviewed content": approved but blank.
    const backend = memoryBackend();
    await seedQuestion(backend, "q1", ASKER);
    await approveQuestion(backend, "q1", ADMIN, "   ");

    expect(await approvedQuestions(backend)).toEqual([]);
  });

  it("never carries who asked it", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "q1", ASKER);
    await approveQuestion(backend, "q1", ADMIN, "Sí, es normal.");

    const [published] = await approvedQuestions(backend);

    expect(Object.keys(published!).sort()).toEqual([
      "answer",
      "answeredAt",
      "id",
      "question",
    ]);
  });
});

describe("the admin queue", () => {
  it("shows pending questions, oldest first", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "first", ASKER);
    await seedQuestion(backend, "second", ASKER);

    const queue = await pendingQuestions(backend);

    expect(queue.map((q) => q.id)).toEqual(["first", "second"]);
  });

  it("does not show a decided question in the pending queue", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "q1", ASKER);
    await approveQuestion(backend, "q1", ADMIN, "Sí.");

    expect(await pendingQuestions(backend)).toEqual([]);
  });

  it("shows recently approved questions for the admin's own review", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "q1", ASKER);
    await approveQuestion(backend, "q1", ADMIN, "Sí.");

    const decided = await decidedQuestions(backend);

    expect(decided.map((q) => q.id)).toEqual(["q1"]);
  });
});

describe("approving and rejecting", () => {
  it("writes the answer and the approval together", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "q1", ASKER);

    const done = await approveQuestion(backend, "q1", ADMIN, "Sí, es normal.");

    expect(done).toBe(true);
    const row = backend.rows.get("q1")!;
    expect(row.status).toBe("approved");
    expect(row.answer).toBe("Sí, es normal.");
    expect(row.answeredByUserId).toBe(ADMIN);
    expect(row.decidedAt).not.toBeNull();
  });

  it("reports false for a question id that does not exist", async () => {
    const backend = memoryBackend();

    expect(await approveQuestion(backend, "no-such-id", ADMIN, "Sí.")).toBe(false);
    expect(await rejectQuestion(backend, "no-such-id", ADMIN)).toBe(false);
  });

  it("keeps a rejected question unanswered rather than deleting it", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "q1", ASKER);

    const done = await rejectQuestion(backend, "q1", ADMIN);

    expect(done).toBe(true);
    const row = backend.rows.get("q1")!;
    expect(row.status).toBe("rejected");
    expect(row.answer).toBeNull();
    expect(backend.rows.has("q1")).toBe(true);
  });

  it("does not let approving one question affect another", async () => {
    const backend = memoryBackend();
    await seedQuestion(backend, "q1", ASKER);
    await seedQuestion(backend, "q2", ASKER);

    await approveQuestion(backend, "q1", ADMIN, "Sí.");

    expect(backend.rows.get("q2")!.status).toBe("pending");
  });
});
