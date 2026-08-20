import "server-only";

import { and, desc, asc, count, eq, gte } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { Database } from "./db";
import { communityQuestions } from "./schema";
import {
  QUESTIONS_PER_DAY,
  type QuestionStatus,
} from "@/lib/community/questions";

// K20 — every query against `communityQuestions`, in one file.
//
// The point of gathering them here is the same as `lib/server/admin.ts`'s: the
// public read must be provably unable to return anything but approved,
// answered rows, and "provably" means one function that every public caller
// goes through, not a `where` clause repeated in a page, a route and a test.
//
// The projections are the other half. `PublicQuestion` has no `askedByUserId`
// and no way to get one — the select lists its columns, so a future caller
// cannot widen the row by accident, and `publicQuestions.test.ts` reads this
// file's source to assert the public projection never names the column.

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

/**
 * The published Q&A, newest answer first.
 *
 * Two conditions, and both are in SQL rather than in a `.filter()` afterwards:
 * `status = approved` is D5's promise, and `answer is not null` stops an
 * approved-but-unanswered row from publishing as a bare question, which is the
 * accidental form of "public unreviewed content".
 *
 * Parameterless and identical for every reader, so the route that wraps it
 * caches under one key for the whole country — the same argument K5 made for
 * `/directory` and `/placements`.
 */
export async function approvedQuestions(
  database: Database,
  limit = 50,
): Promise<PublicQuestion[]> {
  const rows = await database
    .select({
      id: communityQuestions.id,
      question: communityQuestions.question,
      answer: communityQuestions.answer,
      decidedAt: communityQuestions.decidedAt,
    })
    .from(communityQuestions)
    .where(eq(communityQuestions.status, "approved"))
    .orderBy(desc(communityQuestions.decidedAt), desc(communityQuestions.id))
    .limit(limit);

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
  database: Database,
  userId: string,
): Promise<OwnQuestion[]> {
  const rows = await database
    .select({
      id: communityQuestions.id,
      question: communityQuestions.question,
      status: communityQuestions.status,
      answer: communityQuestions.answer,
      createdAt: communityQuestions.createdAt,
    })
    .from(communityQuestions)
    .where(eq(communityQuestions.askedByUserId, userId))
    .orderBy(desc(communityQuestions.createdAt))
    .limit(20);

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
  database: Database,
  userId: string,
  now = Date.now(),
): Promise<number> {
  const rows = await database
    .select({ n: count() })
    .from(communityQuestions)
    .where(
      and(
        eq(communityQuestions.askedByUserId, userId),
        gte(communityQuestions.createdAt, new Date(now - MS_PER_DAY)),
      ),
    );
  return rows[0]?.n ?? 0;
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
  database: Database,
  userId: string,
  question: string,
): Promise<SubmitResult> {
  const today = await questionsTodayCount(database, userId);
  if (today >= QUESTIONS_PER_DAY) return { ok: false, reason: "rate_limited" };

  const id = randomUUID();
  await database.insert(communityQuestions).values({
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
  database: Database,
  limit = 50,
): Promise<QueuedQuestion[]> {
  return database
    .select({
      id: communityQuestions.id,
      question: communityQuestions.question,
      status: communityQuestions.status,
      answer: communityQuestions.answer,
      createdAt: communityQuestions.createdAt,
    })
    .from(communityQuestions)
    .where(eq(communityQuestions.status, "pending"))
    .orderBy(asc(communityQuestions.createdAt))
    .limit(limit);
}

/** Recently decided questions, so an admin can see and fix their own edits. */
export async function decidedQuestions(
  database: Database,
  limit = 20,
): Promise<QueuedQuestion[]> {
  return database
    .select({
      id: communityQuestions.id,
      question: communityQuestions.question,
      status: communityQuestions.status,
      answer: communityQuestions.answer,
      createdAt: communityQuestions.createdAt,
    })
    .from(communityQuestions)
    .where(eq(communityQuestions.status, "approved"))
    .orderBy(desc(communityQuestions.decidedAt))
    .limit(limit);
}

/**
 * Publish a question with an answer.
 *
 * Approval and the answer are one operation, never two. A separate "approve"
 * button would create a window — however short — in which an approved row has
 * no answer and the public query is one `filter` away from publishing a bare
 * question. Writing them together means that state never exists.
 */
export async function approveQuestion(
  database: Database,
  id: string,
  adminUserId: string,
  answer: string,
): Promise<boolean> {
  const result = await database
    .update(communityQuestions)
    .set({
      status: "approved",
      answer,
      answeredByUserId: adminUserId,
      decidedAt: new Date(),
    })
    .where(eq(communityQuestions.id, id));
  return affected(result) > 0;
}

/**
 * Decline to publish.
 *
 * The row stays, with no answer. The asker is told (`STATUS_COPY.rejected`),
 * because a question that silently disappears reads as a bug and gets asked
 * again — and because "we are not answering this here" is itself useful when
 * the honest answer is "ask your doctor".
 */
export async function rejectQuestion(
  database: Database,
  id: string,
  adminUserId: string,
): Promise<boolean> {
  const result = await database
    .update(communityQuestions)
    .set({
      status: "rejected",
      answeredByUserId: adminUserId,
      decidedAt: new Date(),
    })
    .where(eq(communityQuestions.id, id));
  return affected(result) > 0;
}

/** MySQL reports affected rows here. */
function affected(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
}
