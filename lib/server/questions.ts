import "server-only";

import { randomUUID } from "node:crypto";

import type { QuestionsBackend, StoredQuestion } from "./questionsBackend";
import {
  QUESTIONS_PER_DAY,
  type QuestionStatus,
} from "@/lib/community/questions";

// K20 — every rule about the community Q&A queue, in one file.
//
// W5: every function below takes a `QuestionsBackend` (`lib/server/
// questionsBackend.ts`) rather than a `Database`, the same cut V2 gave
// `sharing.ts` and A3 gave `sync.ts`. `questions.test.ts` runs these functions,
// unchanged, over a Map — the point of gathering them here is the same as
// `lib/server/admin.ts`'s: the public read must be provably unable to return
// anything but approved, answered rows, and "provably" means one function
// every public caller goes through, tested without a database, not a `where`
// clause repeated in a page, a route and a test.
//
// The projections are the other half. `PublicQuestion` has no `askedByUserId`
// and no way to get one — the mapping below lists its own fields, so a future
// caller cannot widen the row by accident, and `publicQuestions.test.ts` reads
// this file's source to assert the public projection never names the column.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** What a public page may see: the question, the answer, and when. */
export interface PublicQuestion {
  id: string;
  question: string;
  answer: string;
  answeredAt: string | null;
}

/** What the asker sees about her own question. Never anybody else's. */
export interface OwnQuestion {
  id: string;
  question: string;
  status: QuestionStatus;
  answer: string | null;
  createdAt: string;
}

/** What the admin queue shows. Includes pending, which nothing else may. */
export interface QueuedQuestion {
  id: string;
  question: string;
  status: QuestionStatus;
  answer: string | null;
  createdAt: Date;
}

function toQueued(row: StoredQuestion): QueuedQuestion {
  return {
    id: row.id,
    question: row.question,
    status: row.status,
    answer: row.answer,
    createdAt: row.createdAt,
  };
}

/**
 * The published Q&A, newest answer first.
 *
 * Two conditions guard a bare question from ever publishing: `status =
 * approved` is filtered in SQL by the backend's `approvedNewestFirst` (D5's
 * promise, and it stays in the query for the reason `lib/community/
 * questions.ts` gives), and `answer is not null` — checked here, in JS,
 * because it decides what the public projection contains rather than what the
 * database returns — stops an approved-but-unanswered row from publishing as a
 * bare question, which is the accidental form of "public unreviewed content".
 *
 * Parameterless and identical for every reader, so the route that wraps it
 * caches under one key for the whole country — the same argument K5 made for
 * `/directory` and `/placements`.
 */
export async function approvedQuestions(
  backend: QuestionsBackend,
  limit = 50,
): Promise<PublicQuestion[]> {
  const rows = await backend.approvedNewestFirst(limit);

  return rows
    .filter((row) => (row.answer?.trim().length ?? 0) > 0)
    .map((row) => ({
      id: row.id,
      question: row.question,
      answer: row.answer!,
      // Date only. A published answer needs to show it is current; the minute
      // it was approved says something about an administrator's working hours
      // and nothing about the answer.
      answeredAt: row.decidedAt ? row.decidedAt.toISOString().slice(0, 10) : null,
    }));
}

/** Every question this user asked, whatever its state, newest first. */
export async function questionsOf(
  backend: QuestionsBackend,
  userId: string,
): Promise<OwnQuestion[]> {
  const rows = await backend.ofUser(userId, 20);

  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    status: row.status,
    answer: row.answer,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** How many questions this user has submitted in the last 24 hours. */
export async function questionsTodayCount(
  backend: QuestionsBackend,
  userId: string,
  now = Date.now(),
): Promise<number> {
  return backend.countSince(userId, new Date(now - MS_PER_DAY));
}

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; reason: "rate_limited" };

/**
 * Store a question, pending.
 *
 * The per-account daily cap is checked here rather than only in the route,
 * because the route's IP-based limiter answers a different question. An IP cap
 * stops a flood; it also throttles a whole shared connection, and in Paraguay
 * a household or a locutorio behind one address is normal. The per-account cap
 * is the one that means "this person is asking too much", and it is the one
 * with a number in it that a human chose (`QUESTIONS_PER_DAY`).
 */
export async function submitQuestion(
  backend: QuestionsBackend,
  userId: string,
  question: string,
): Promise<SubmitResult> {
  const today = await questionsTodayCount(backend, userId);
  if (today >= QUESTIONS_PER_DAY) return { ok: false, reason: "rate_limited" };

  const id = randomUUID();
  await backend.insert({
    id,
    askedByUserId: userId,
    question,
    status: "pending",
  });
  return { ok: true, id };
}

/**
 * The admin queue: pending first and oldest first inside it.
 *
 * Oldest first because the queue is a promise with a clock on it — a woman who
 * asked eight days ago has been waiting longer than the interesting question
 * that arrived this morning, and a newest-first queue quietly never reaches
 * her.
 */
export async function pendingQuestions(
  backend: QuestionsBackend,
  limit = 50,
): Promise<QueuedQuestion[]> {
  const rows = await backend.pending(limit);
  return rows.map(toQueued);
}

/** Recently decided questions, so an admin can see and fix their own edits. */
export async function decidedQuestions(
  backend: QuestionsBackend,
  limit = 20,
): Promise<QueuedQuestion[]> {
  const rows = await backend.decided(limit);
  return rows.map(toQueued);
}

/**
 * Publish a question with an answer.
 *
 * Approval and the answer are one operation, never two: both fields are in the
 * single `decide` call below, so an approved row with no answer never exists
 * to be read by the public query. A separate "approve" button would create a
 * window — however short — in which that state exists.
 */
export async function approveQuestion(
  backend: QuestionsBackend,
  id: string,
  adminUserId: string,
  answer: string,
): Promise<boolean> {
  return backend.decide(id, {
    status: "approved",
    answer,
    answeredByUserId: adminUserId,
    decidedAt: new Date(),
  });
}

/**
 * Decline to publish.
 *
 * The row stays, with no answer touched — a pending row never had one. The
 * asker is told (`STATUS_COPY.rejected`), because a question that silently
 * disappears reads as a bug and gets asked again — and because "we are not
 * answering this here" is itself useful when the honest answer is "ask your
 * doctor".
 */
export async function rejectQuestion(
  backend: QuestionsBackend,
  id: string,
  adminUserId: string,
): Promise<boolean> {
  return backend.decide(id, {
    status: "rejected",
    answeredByUserId: adminUserId,
    decidedAt: new Date(),
  });
}
