import "server-only";

import { eq } from "drizzle-orm";

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

// BUILD-PLAN F1 — the generation pipeline, server-only.
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

/** The model call, behind an interface so tests never reach Google. */
export type ImageModel = (
  photos: ParentPhoto[],
  model: string,
  apiKey: string,
) => Promise<GeneratedImage | null>;

export function isConfigured(): boolean {
  return isAiBabyEnabled(process.env);
}

/**
 * Generate, and record that we did.
 *
 * The `aiGenerations` row is written BEFORE the call and updated after, so a
 * request that dies mid-flight still leaves evidence that money may have been
 * spent. A row written only on success would under-count exactly the failures
 * F2's quota and I4's spend alarm need to see.
 */
export async function generateBabyImage(
  database: Database,
  userId: string,
  photos: ParentPhoto[],
  callModel: ImageModel = geminiModel,
  now: Date = new Date(),
): Promise<GenerationResult> {
  if (!isConfigured()) return { ok: false, failure: "disabled" };
  if (validatePhotos(photos) !== null) return { ok: false, failure: "invalid" };

  const apiKey = process.env.GEMINI_API_KEY!.trim();
  const model = aiBabyModel(process.env);
  const id = crypto.randomUUID();

  await database.insert(aiGenerations).values({
    id,
    userId,
    quotaMonth: quotaMonthOf(now),
    model,
    status: "pending",
  });

  let image: GeneratedImage | null = null;
  try {
    image = await callModel(photos, model, apiKey);
  } catch {
    // Swallow deliberately: an upstream error message can quote the request,
    // and the request contains someone's face.
    image = null;
  }

  if (!image) {
    await database
      .update(aiGenerations)
      .set({ status: "failed" })
      .where(eq(aiGenerations.id, id));
    return { ok: false, failure: "no-image" };
  }

  await database
    .update(aiGenerations)
    .set({ status: "succeeded", costUsdMicros: aiBabyCostMicros(process.env) })
    .where(eq(aiGenerations.id, id));

  // Returned to the caller and forgotten here. Storing it is the device's
  // decision (§10: "the result is stored only if the user saves it").
  return { ok: true, image };
}

/** "YYYY-MM", the quota window F2 will count against. */
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
