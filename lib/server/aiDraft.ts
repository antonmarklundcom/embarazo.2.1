import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";

import type { Database } from "./db";
import { adminAudit } from "./schema";
import { parseAuditMeta } from "@/lib/admin/audit";
import { ANSWER_MAX } from "@/lib/community/questions";
import {
  aiDraftDailyCap,
  aiDraftModel,
  buildDraftPrompt,
  isAiDraftEnabled,
  sanitiseDraftText,
  type DraftResult,
} from "@/lib/ai/draft";

// U9 — AI-drafted answers inside the curated Q&A queue (K20), server half.
//
// Same shape as `lib/server/aiBaby.ts` on purpose: a kill switch checked here
// (not just in the pure module, so a caller cannot skip it), a model call
// behind an interface so tests never reach Google, and cost control that
// counts from a table rather than trusting a client-supplied number.
//
// **Nothing generated here ever reaches a user.** The draft returned by
// `generateDraft` goes back to the admin's own request as an editable prefill
// of the answer textarea; publishing is still `answerQuestion` in
// `app/admin/actions.ts`, unchanged. No file under `app/(app)` or
// `app/api/v1` may import this module — asserted below against the source, the
// same way `admin.test.ts` asserts the panel never selects `payload`.
//
// **Cost control without a migration.** `AI_DRAFT_DAILY_CAP` counts
// `adminAudit` rows with action `draft_generated`, written before the model is
// called so a crash after the write still counts against the day. There is no
// per-user split — the panel is one administrator (K20's own note: "there is
// no moderator role") — so a single UTC-day count is the whole rule.

/** The model call, behind an interface so tests never reach Google. */
export type DraftModel = (
  question: string,
  model: string,
  apiKey: string,
) => Promise<string | null>;

export function isConfigured(): boolean {
  return isAiDraftEnabled(process.env);
}

// ---------------------------------------------------------------------------
// The cap store
// ---------------------------------------------------------------------------

export interface DraftAuditStore {
  /** `draft_generated` audit rows from `since` (inclusive) onward. */
  countSince(since: Date): Promise<number>;
  /** Write the row. Called BEFORE the model is asked, so a crash still counts. */
  record(questionId: string, actorUserId: string): Promise<void>;
}

export function drizzleDraftAuditStore(database: Database): DraftAuditStore {
  return {
    async countSince(since) {
      const rows = await database
        .select({ total: sql<number>`count(*)` })
        .from(adminAudit)
        .where(
          and(
            eq(adminAudit.action, "draft_generated"),
            gte(adminAudit.createdAt, since),
          ),
        );
      return Number(rows[0]?.total ?? 0);
    },
    async record(questionId, actorUserId) {
      // Written directly rather than through `lib/server/admin.ts`'s
      // `recordAudit`: that module sits next to `requireAdmin` and imports
      // `./auth`, which pulls NextAuth's entrypoint into anything that
      // imports it — exactly the reason `setFlag` in `lib/server/flags.ts`
      // writes its own `adminAudit` insert instead of calling `recordAudit`.
      // The validation that matters (`parseAuditMeta`) is still shared.
      const meta = parseAuditMeta("draft_generated", { questionId });
      await database.insert(adminAudit).values({
        id: crypto.randomUUID(),
        actorUserId,
        action: "draft_generated",
        meta,
      });
    },
  };
}

/** Midnight UTC of the day `date` falls in — the cap's counting window. */
export function utcDayStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

// ---------------------------------------------------------------------------
// Availability — what the admin UI shows instead of the button
// ---------------------------------------------------------------------------

export type DraftAvailability =
  | { available: true }
  | { available: false; reason: "disabled" | "cap-reached" };

/**
 * Whether the queue should offer "Sugerir borrador" at all, without
 * generating one. `isConfigured()` is checked first and separately from the
 * cap so a fully-disabled deployment never even queries `adminAudit` — the
 * page renders exactly as it did before this feature existed.
 */
export async function draftAvailability(
  store: DraftAuditStore,
  now: Date = new Date(),
): Promise<DraftAvailability> {
  if (!isConfigured()) return { available: false, reason: "disabled" };

  const used = await store.countSince(utcDayStart(now));
  const cap = aiDraftDailyCap(process.env);
  if (used >= cap) return { available: false, reason: "cap-reached" };

  return { available: true };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Generate a draft, and record that we tried.
 *
 * Order: fail closed → check the cap → write the audit row → call the model.
 * The row goes in before the call (not after) so that a crash mid-call still
 * shows up in tomorrow's read of today's count; a refusal before that point
 * writes nothing, the same way `isConfigured()` returning false costs nothing
 * in `lib/server/aiBaby.ts`.
 */
export async function generateDraft(
  store: DraftAuditStore,
  actorUserId: string,
  questionId: string,
  question: string,
  callModel: DraftModel = geminiDraftModel,
  now: Date = new Date(),
): Promise<DraftResult> {
  if (!isConfigured()) return { ok: false, failure: "disabled" };

  const cap = aiDraftDailyCap(process.env);
  const used = await store.countSince(utcDayStart(now));
  if (used >= cap) return { ok: false, failure: "cap-reached" };

  await store.record(questionId, actorUserId);

  const apiKey = process.env.GEMINI_API_KEY!.trim();
  const model = aiDraftModel(process.env);

  let text: string | null = null;
  try {
    text = await callModel(question, model, apiKey);
  } catch {
    // Swallow deliberately, same as `generateBabyImage`: an upstream error
    // message can quote the request, which here is a user's question.
    text = null;
  }

  if (!text || !text.trim()) return { ok: false, failure: "no-draft" };

  const draft = sanitiseDraftText(text).slice(0, ANSWER_MAX);
  return { ok: true, draft };
}

// ---------------------------------------------------------------------------
// The real model
// ---------------------------------------------------------------------------

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Call Gemini's text endpoint.
 *
 * The key goes in a header rather than the query string, same reasoning as
 * `geminiModel` in `lib/server/aiBaby.ts`: a query string ends up in access
 * logs and proxy caches, and this one is a live credential.
 */
export const geminiDraftModel: DraftModel = async (question, model, apiKey) => {
  const res = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: buildDraftPrompt(question) }] },
        ],
      }),
      // A draft is not worth blocking the admin's request indefinitely for.
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!res.ok) return null;

  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = (body.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("");

  return text.trim() || null;
};
