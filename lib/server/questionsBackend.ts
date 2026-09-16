import "server-only";

import { and, asc, count, desc, eq, gte } from "drizzle-orm";

import type { Database } from "./db";
import { communityQuestions } from "./schema";
import type { QuestionStatus } from "@/lib/community/questions";

// BUILD-PLAN K20, W5 — the storage half of the community Q&A queue.
//
// Same cut as V2's `sharingBackend.ts` and A3's `SyncBackend`: `questions.ts`
// holds the decisions (what counts as public, what a submission costs, what a
// decision writes), this file holds every query against `communityQuestions`.
//
// **`approvedNewestFirst` filters `status = "approved"` in SQL, not after the
// fetch, and that stays true here rather than becoming a fact about a Map.**
// `lib/community/questions.ts` says why: a page that forgot to check the
// status still cannot get a pending row out of the function that has this
// WHERE clause in it. `questions.ts` itself never sees an unfiltered row.
//
// No policy: nothing here decides whether an answer is fit to publish, or
// which fields a decision writes — those are `questions.ts`'s job. This file
// only runs the query it is handed.

export interface StoredQuestion {
  id: string;
  askedByUserId: string;
  question: string;
  status: QuestionStatus;
  answer: string | null;
  answeredByUserId: string | null;
  createdAt: Date;
  decidedAt: Date | null;
}

/** The fields a decision (approve or reject) writes together. */
export interface QuestionDecision {
  status: "approved" | "rejected";
  answeredByUserId: string;
  decidedAt: Date;
  /** Present only for an approval — a rejection leaves the answer column alone. */
  answer?: string;
}

export interface QuestionsBackend {
  insert(row: {
    id: string;
    askedByUserId: string;
    question: string;
    status: "pending";
  }): Promise<void>;
  /** How many this account has submitted since the given instant. */
  countSince(userId: string, since: Date): Promise<number>;
  /** Every question this user asked, newest first. */
  ofUser(userId: string, limit: number): Promise<StoredQuestion[]>;
  /** `status = "approved"`, newest decided first — filtered in SQL. */
  approvedNewestFirst(limit: number): Promise<StoredQuestion[]>;
  /** `status = "pending"`, oldest first. */
  pending(limit: number): Promise<StoredQuestion[]>;
  /** `status = "approved"`, newest decided first, for the admin's own recent edits. */
  decided(limit: number): Promise<StoredQuestion[]>;
  /** Write a decision's fields. `false` when the id matches no row. */
  decide(id: string, fields: QuestionDecision): Promise<boolean>;
}

function toStored(row: typeof communityQuestions.$inferSelect): StoredQuestion {
  return {
    id: row.id,
    askedByUserId: row.askedByUserId,
    question: row.question,
    status: row.status,
    answer: row.answer,
    answeredByUserId: row.answeredByUserId,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
  };
}

/** The real thing. Constructed once per request. */
export function drizzleQuestionsBackend(database: Database): QuestionsBackend {
  return {
    async insert(row) {
      await database.insert(communityQuestions).values(row);
    },

    async countSince(userId, since) {
      const rows = await database
        .select({ n: count() })
        .from(communityQuestions)
        .where(
          and(
            eq(communityQuestions.askedByUserId, userId),
            gte(communityQuestions.createdAt, since),
          ),
        );
      return rows[0]?.n ?? 0;
    },

    async ofUser(userId, limit) {
      const rows = await database
        .select()
        .from(communityQuestions)
        .where(eq(communityQuestions.askedByUserId, userId))
        .orderBy(desc(communityQuestions.createdAt))
        .limit(limit);
      return rows.map(toStored);
    },

    async approvedNewestFirst(limit) {
      const rows = await database
        .select()
        .from(communityQuestions)
        .where(eq(communityQuestions.status, "approved"))
        .orderBy(desc(communityQuestions.decidedAt), desc(communityQuestions.id))
        .limit(limit);
      return rows.map(toStored);
    },

    async pending(limit) {
      const rows = await database
        .select()
        .from(communityQuestions)
        .where(eq(communityQuestions.status, "pending"))
        .orderBy(asc(communityQuestions.createdAt))
        .limit(limit);
      return rows.map(toStored);
    },

    async decided(limit) {
      const rows = await database
        .select()
        .from(communityQuestions)
        .where(eq(communityQuestions.status, "approved"))
        .orderBy(desc(communityQuestions.decidedAt))
        .limit(limit);
      return rows.map(toStored);
    },

    async decide(id, fields) {
      const result = await database
        .update(communityQuestions)
        .set(fields)
        .where(eq(communityQuestions.id, id));
      return affected(result) > 0;
    },
  };
}

/** MySQL reports affected rows here. */
function affected(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
}
