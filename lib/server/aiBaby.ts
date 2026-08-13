import "server-only";

import { and, eq, sql } from "drizzle-orm";

import type { Database } from "./db";
import { aiGenerations } from "./schema";
import {
  AI_BABY_PROMPT,
  aiBabyCostMicros,
  aiBabyModel,
  isAiBabyEnabled,
  validatePhotos,
  type GeneratedImage,
  type GenerationResult,
  type ParentPhoto,
} from "@/lib/ai/babyImage";
import {
  aiBabyMonthlyQuota,
  aiBabySpendCeilingMicros,
  committedMicros,
  quotaVerdict,
  remainingGenerations,
} from "@/lib/ai/quota";

// BUILD-PLAN F1 + F2 — the generation pipeline, server-only.
//
// **The API key never leaves this process.** It is read here, used in a header
// here, and there is no route, prop or response anywhere that carries it. The
// client posts photos to us and gets an image back; it never learns who
// generated it or with what credential.
//
// **Parent photos are not retained.** They exist as function arguments for the
// duration of one request. Nothing in this file writes them — not to
// `aiGenerations` (which has no column for them, asserted in schema.test.ts),
// not to disk, not to a log. The only thing that outlives the request is a row
// saying a generation happened, which model, and what it cost.
//
// **F2: nothing reaches the model before both limits have been checked**, and
// the check reads the same table the pipeline writes, so it cannot be bypassed
// by a client — there is no client-supplied number in it at all. Database
// access goes through `QuotaStore` rather than through Drizzle calls inline,
// for the reason A5's executor interface exists: it makes "the quota cannot be
// exceeded" provable in CI against an in-memory store, with no MySQL.

/** The model call, behind an interface so tests never reach Google. */
export type ImageModel = (
  photos: ParentPhoto[],
  model: string,
  apiKey: string,
) => Promise<GeneratedImage | null>;

export function isConfigured(): boolean {
  return isAiBabyEnabled(process.env);
}

// ---------------------------------------------------------------------------
// The quota store
// ---------------------------------------------------------------------------

/** A reservation: the `aiGenerations` row written before the model is called. */
export interface Reservation {
  id: string;
  userId: string;
  quotaMonth: string;
  model: string;
}

export interface QuotaStore {
  /** Write the pending row. This IS the reservation — see `generateBabyImage`. */
  reserve(row: Reservation): Promise<void>;
  /** Drop a reservation that never reached the model, so it counts against
   * nothing. A refusal is not a failure and must not look like one to I4. */
  release(id: string): Promise<void>;
  finish(id: string, costUsdMicros: number): Promise<void>;
  fail(id: string): Promise<void>;
  /** This user's generations in `month`, excluding refused/failed ones. */
  countForUser(userId: string, month: string): Promise<number>;
  /** Everyone's spend in `month`: settled cost, plus what is still in flight. */
  monthSpend(
    month: string,
  ): Promise<{ succeededMicros: number; pendingCount: number }>;
}

export function drizzleQuotaStore(database: Database): QuotaStore {
  return {
    async reserve(row) {
      await database.insert(aiGenerations).values({
        id: row.id,
        userId: row.userId,
        quotaMonth: row.quotaMonth,
        model: row.model,
        status: "pending",
      });
    },
    async release(id) {
      await database.delete(aiGenerations).where(eq(aiGenerations.id, id));
    },
    async finish(id, costUsdMicros) {
      await database
        .update(aiGenerations)
        .set({ status: "succeeded", costUsdMicros })
        .where(eq(aiGenerations.id, id));
    },
    async fail(id) {
      await database
        .update(aiGenerations)
        .set({ status: "failed" })
        .where(eq(aiGenerations.id, id));
    },
    async countForUser(userId, month) {
      // A generation the model never delivered does not spend the user's
      // month. The abuse it opens — forcing upstream failures on purpose — is
      // bounded by the route's per-IP rate limit and by the global ceiling,
      // which counts money rather than attempts.
      const rows = await database
        .select({ total: sql<number>`count(*)` })
        .from(aiGenerations)
        .where(
          and(
            eq(aiGenerations.userId, userId),
            eq(aiGenerations.quotaMonth, month),
            sql`${aiGenerations.status} <> 'failed'`,
          ),
        );
      return Number(rows[0]?.total ?? 0);
    },
    async monthSpend(month) {
      const rows = await database
        .select({
          succeededMicros: sql<number>`coalesce(sum(case when ${aiGenerations.status} = 'succeeded' then ${aiGenerations.costUsdMicros} else 0 end), 0)`,
          pendingCount: sql<number>`coalesce(sum(case when ${aiGenerations.status} = 'pending' then 1 else 0 end), 0)`,
        })
        .from(aiGenerations)
        .where(eq(aiGenerations.quotaMonth, month));
      return {
        succeededMicros: Number(rows[0]?.succeededMicros ?? 0),
        pendingCount: Number(rows[0]?.pendingCount ?? 0),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Generate, and record that we did.
 *
 * The `aiGenerations` row is written BEFORE the call and updated after, so a
 * request that dies mid-flight still leaves evidence that money may have been
 * spent. A row written only on success would under-count exactly the failures
 * the quota and I4's spend alarm need to see.
 *
 * F2 makes that row do double duty: it is also the **reservation**. The order
 * is reserve → count → refuse-and-release, never count → reserve, because two
 * requests arriving together would both read the pre-request count and both
 * proceed. Reserving first means each of them sees the other, and the failure
 * direction is refusing a request that would have fitted rather than spending
 * money that was not there. The user retries and it works.
 */
export async function generateBabyImage(
  store: QuotaStore,
  userId: string,
  photos: ParentPhoto[],
  callModel: ImageModel = geminiModel,
  now: Date = new Date(),
): Promise<GenerationResult> {
  if (!isConfigured()) return { ok: false, failure: "disabled" };
  if (validatePhotos(photos) !== null) return { ok: false, failure: "invalid" };

  const apiKey = process.env.GEMINI_API_KEY!.trim();
  const model = aiBabyModel(process.env);
  const costMicros = aiBabyCostMicros(process.env);
  const month = quotaMonthOf(now);
  const id = crypto.randomUUID();

  await store.reserve({ id, userId, quotaMonth: month, model });

  const [used, spend] = await Promise.all([
    store.countForUser(userId, month),
    store.monthSpend(month),
  ]);

  const verdict = quotaVerdict({
    used,
    quota: aiBabyMonthlyQuota(process.env),
    committed: committedMicros({ ...spend, costMicros }),
    ceiling: aiBabySpendCeilingMicros(process.env),
  });

  if (verdict !== "ok") {
    // Nothing was sent anywhere and nothing was spent, so the row goes away
    // entirely rather than lingering as a "failure" in next month's numbers.
    await store.release(id);
    return { ok: false, failure: verdict };
  }

  let image: GeneratedImage | null = null;
  try {
    image = await callModel(photos, model, apiKey);
  } catch {
    // Swallow deliberately: an upstream error message can quote the request,
    // and the request contains someone's face.
    image = null;
  }

  if (!image) {
    await store.fail(id);
    return { ok: false, failure: "no-image" };
  }

  await store.finish(id, costMicros);

  // Returned to the caller and forgotten here. Storing it is the device's
  // decision (§10: "the result is stored only if the user saves it").
  return { ok: true, image };
}

/** What the screen shows before anyone uploads anything. */
export interface QuotaSnapshot {
  quota: number;
  used: number;
  remaining: number;
}

export async function quotaSnapshot(
  store: QuotaStore,
  userId: string,
  now: Date = new Date(),
): Promise<QuotaSnapshot> {
  const quota = aiBabyMonthlyQuota(process.env);
  const used = await store.countForUser(userId, quotaMonthOf(now));
  return { quota, used, remaining: remainingGenerations(used, quota) };
}

/** "YYYY-MM", the quota window generations are counted against. */
export function quotaMonthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// The real model
// ---------------------------------------------------------------------------

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Call Gemini's image endpoint.
 *
 * The key goes in a header rather than the query string: query strings end up
 * in access logs and proxy caches, and this one is a live credential.
 */
export const geminiModel: ImageModel = async (photos, model, apiKey) => {
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
          {
            role: "user",
            parts: [
              { text: AI_BABY_PROMPT },
              ...photos.map((photo) => ({
                inline_data: { mime_type: photo.mimeType, data: photo.data },
              })),
            ],
          },
        ],
      }),
    },
  );

  if (!res.ok) return null;

  const body = (await res.json()) as {
    candidates?: {
      content?: {
        parts?: { inlineData?: { mimeType?: string; data?: string } }[];
      };
    }[];
  };

  for (const part of body.candidates?.[0]?.content?.parts ?? []) {
    const inline = part.inlineData;
    if (inline?.data) {
      return { mimeType: inline.mimeType ?? "image/png", data: inline.data };
    }
  }
  return null;
};
