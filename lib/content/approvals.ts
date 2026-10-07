import type { Approval, Reviewer } from "./schemas.ts";
import { sha256Hex } from "./sha256.ts";

// F22 — clinical review is recorded per item and per version, not per deployment.
//
// Before this, one build-time variable (`NEXT_PUBLIC_MEDICAL_REVIEWER`) put
// "Revisado por {name}" on every medical-adjacent screen and unlocked all 42
// obstetra notes and every symptom-insight sentence at once. A clinician who
// approved five food entries would have been credited with all of it, and an
// approval never noticed that its text had changed since.
//
// Now an item shows a reviewer only when `lib/seed/approvals.json` holds an
// approval for that item's id whose `contentHash` matches the text that is
// about to render, by a reviewer listed in `lib/seed/reviewers.json`. Anything
// else — no approval, an edited text, an unknown reviewer — reads as "not
// reviewed": the generic disclaimer, or no card at all where the card's whole
// value is the signature.
//
// This module is pure and imports with explicit `.ts` paths so that
// `scripts/validate-content.mts` (plain Node, type stripping) can run the very
// same functions the app renders with. `lib/seed/approvals.ts` is the app-side
// loader for the shipped registry.

/**
 * The text that is hashed: line endings and runs of ASCII whitespace collapse
 * to one space, then the ends are trimmed. Reflowing a paragraph does not undo
 * an approval; changing a word does. ASCII-only on purpose, so PHP's
 * `preg_replace('/[ \t\r\n]+/', ' ', …)` reproduces it exactly on the site.
 */
export function normalizeClinicalText(text: string): string {
  return text.replace(/[ \t\r\n]+/g, " ").trim();
}

/** SHA-256 (hex) of the normalised text — what an approval pins. */
export function contentHash(text: string): string {
  return sha256Hex(normalizeClinicalText(text));
}

// Content ids. One per reviewable unit; the prefix says which collection.
export const obstetraContentId = (week: number) => `obstetra:${week}`;
export const insightContentId = (templateId: string) => `insight:${templateId}`;
export const foodContentId = (foodId: string) => `food:${foodId}`;
export const guiaContentId = (slug: string) => `guia:${slug}`;

/** What a reviewer of a symptom-insight template signs: both sentences. */
export function insightClinicalText(template: { line: string; hint: string }): string {
  return `${template.line}\n${template.hint}`;
}

/** What a reviewer of a food entry signs: the verdict and everything said about it. */
export function foodClinicalText(entry: {
  name: string;
  verdict: string;
  reason: string;
  detail?: string;
}): string {
  return [entry.name, entry.verdict, entry.reason, entry.detail ?? ""].join("\n");
}

export interface ApprovalRegistry {
  reviewers: readonly Reviewer[];
  approvals: readonly Approval[];
}

/** A review the UI may show: who, in what capacity, and when. */
export interface ShownReview {
  reviewerName: string;
  profession: string;
  reviewedAt: string;
}

export type ApprovalStatus =
  | ({ status: "approved" } & ShownReview)
  | { status: "stale"; reviewerName: string; reviewedAt: string }
  | { status: "unknown-reviewer"; reviewerId: string }
  | { status: "missing" };

/** The approval state of one item's current text. */
export function approvalStatus(
  registry: ApprovalRegistry,
  contentId: string,
  text: string,
): ApprovalStatus {
  const approval = registry.approvals.find((entry) => entry.contentId === contentId);
  if (!approval) return { status: "missing" };
  const reviewer = registry.reviewers.find((entry) => entry.id === approval.reviewerId);
  if (!reviewer) return { status: "unknown-reviewer", reviewerId: approval.reviewerId };
  if (approval.contentHash !== contentHash(text)) {
    return { status: "stale", reviewerName: reviewer.name, reviewedAt: approval.reviewedAt };
  }
  return {
    status: "approved",
    reviewerName: reviewer.name,
    profession: reviewer.profession,
    reviewedAt: approval.reviewedAt,
  };
}

/** The review to show for this exact text, or `null` — the only thing callers render from. */
export function reviewFor(
  registry: ApprovalRegistry,
  contentId: string,
  text: string,
): ShownReview | null {
  const result = approvalStatus(registry, contentId, text);
  if (result.status !== "approved") return null;
  return {
    reviewerName: result.reviewerName,
    profession: result.profession,
    reviewedAt: result.reviewedAt,
  };
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

/**
 * "7 de octubre de 2026" from "2026-10-07". Spelled out by hand rather than
 * with `toLocaleDateString`, so a server render and the browser's hydration
 * can never disagree about the words (ICU data differs between runtimes).
 */
export function formatReviewDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} de ${MONTHS_ES[(month ?? 1) - 1]} de ${year}`;
}

/** One reviewable item as `approvalProblems` sees it. */
export interface ReviewableItem {
  contentId: string;
  text: string;
  /** A `reviewedBy` the seed entry itself claims (food, prices, articles). */
  claimedReviewer?: string;
}

/**
 * What `npm run validate:content` reports about the registry.
 *
 * `errors` fail the run: an approval for content that does not exist, by a
 * reviewer who is not registered; a `reviewedBy` claim naming somebody who is
 * not a registered reviewer, or a claim with no current approval behind it.
 * `stale` is a to-do list, not an error: the item already renders as
 * unreviewed, and re-approving it is a clinician's job, not a build's.
 */
export function approvalProblems(
  registry: ApprovalRegistry,
  items: readonly ReviewableItem[],
): { errors: string[]; stale: string[] } {
  const errors: string[] = [];
  const stale: string[] = [];
  const byId = new Map(items.map((item) => [item.contentId, item]));
  const reviewerNames = new Set(registry.reviewers.map((reviewer) => reviewer.name));

  for (const approval of registry.approvals) {
    if (!registry.reviewers.some((reviewer) => reviewer.id === approval.reviewerId)) {
      errors.push(
        `lib/seed/approvals.json — ${approval.contentId}: el revisor "${approval.reviewerId}" no está en lib/seed/reviewers.json`,
      );
    }
    const item = byId.get(approval.contentId);
    if (!item) {
      errors.push(
        `lib/seed/approvals.json — ${approval.contentId}: no existe ningún contenido con ese id`,
      );
      continue;
    }
    if (approvalStatus(registry, item.contentId, item.text).status === "stale") {
      stale.push(
        `${approval.contentId}: el texto cambió después de la aprobación del ${approval.reviewedAt} — se muestra como no revisado hasta que se vuelva a aprobar (contentHash del texto actual: ${contentHash(item.text)})`,
      );
    }
  }

  for (const item of items) {
    if (item.claimedReviewer === undefined) continue;
    if (!reviewerNames.has(item.claimedReviewer)) {
      errors.push(
        `${item.contentId}: reviewedBy "${item.claimedReviewer}" no es un revisor registrado en lib/seed/reviewers.json — no se puede atribuir una revisión a quien no la firmó`,
      );
      continue;
    }
    const current = approvalStatus(registry, item.contentId, item.text);
    if (current.status !== "approved" || current.reviewerName !== item.claimedReviewer) {
      errors.push(
        `${item.contentId}: dice reviewedBy "${item.claimedReviewer}" pero no hay una aprobación vigente de ese revisor para el texto actual en lib/seed/approvals.json`,
      );
    }
  }

  return { errors, stale };
}
