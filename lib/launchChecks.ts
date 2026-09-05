// Launch-readiness checks run at build time (BUILD-PLAN Z2).
//
// The failure this prevents: shipping a real deployment whose publicly
// reachable deletion page tells people to contact nobody.
//
// Scope: checks fire only when NEXT_PUBLIC_APP_URL is set, which is the signal
// that this build is a configured deployment rather than a local `npm run
// build` or a CI compile check.
//
// 2026-09 — the medical-reviewer hard gate that used to live here was removed
// (DECISIONS.md "disclaimer model, not a named reviewer"). Requiring a real
// named gineco-obstetra before the build would even compile made "launch"
// wait on recruiting a clinician; the honest alternative is to say plainly,
// everywhere medical-adjacent content renders, that it is informational and
// not reviewed by a professional (`components/MedicalReviewByline.tsx`)
// instead of pretending nobody built the app until one signs on. That
// disclaimer is unconditional now, so there is nothing left here to check —
// `isPlaceholderReviewer` stays exported because the byline and the obstetra
// card still use it to decide which of the two messages to show, and
// `lib/seed/gate.ts`'s `reviewedOnly()` still hides any *specific* clinical
// content (food-safety verdicts, the obstetra's weekly notes) that has not
// been signed off — a general disclaimer does not make a wrong answer to
// "is X safe to eat during pregnancy" safe to publish as reviewed. That gate
// is untouched by this file and is not something a deployment build can skip.

import { hasDeletionChannel, supportChannels } from "./support";

/** Marker left in `.env.example` and the CI placeholder value. */
const REVIEWER_PLACEHOLDER_MARKERS = ["___", "placeholder", "tbd"];

export interface LaunchCheckEnv {
  // Index signature so `process.env` (NodeJS.ProcessEnv) is assignable.
  [key: string]: string | undefined;
  NEXT_PUBLIC_APP_URL?: string;
  // The deletion request channels — see the check below.
  NEXT_PUBLIC_SUPPORT_EMAIL?: string;
  NEXT_PUBLIC_BUSINESS_WHATSAPP?: string;
}

/** True when this build targets a configured deployment. */
export function isDeploymentBuild(env: LaunchCheckEnv): boolean {
  return Boolean(env.NEXT_PUBLIC_APP_URL?.trim());
}

/**
 * True when `value` is not a real reviewer name — unset, blank, or one of the
 * placeholder markers left in `.env.example`. Still used at render time by
 * `MedicalReviewByline` and `ObstetraCard` to choose between the named byline
 * and the generic disclaimer; no longer used to block a build.
 */
export function isPlaceholderReviewer(value: string | undefined): boolean {
  const reviewer = value?.trim() ?? "";
  if (reviewer === "") return true;
  const lower = reviewer.toLowerCase();
  return REVIEWER_PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * Returns a list of human-readable problems that must block a deployment
 * build. Empty means the build may proceed.
 */
export function launchCheckErrors(env: LaunchCheckEnv): string[] {
  if (!isDeploymentBuild(env)) return [];

  const errors: string[] = [];

  // `/borrar-cuenta` is the publicly reachable deletion page Google Play
  // requires (`docs/ANDROID-LAUNCH.md` §3.3). It tells a person to contact us,
  // so a deployment where nobody can be contacted ships a promise with nothing
  // behind it — to someone asking for their health data to be deleted, which
  // is the worst possible audience for an unanswered message. One channel is
  // enough; zero is a broken submission and a broken promise.
  if (!hasDeletionChannel(supportChannels(env))) {
    errors.push(
      "No deletion channel is configured, so /borrar-cuenta would tell " +
        "people to contact nobody. Set NEXT_PUBLIC_SUPPORT_EMAIL or " +
        "NEXT_PUBLIC_BUSINESS_WHATSAPP to a real, monitored address — Play " +
        "requires a public way to request account deletion without " +
        "installing the app (docs/ANDROID-LAUNCH.md §3.3).",
    );
  }

  return errors;
}

/** Throws with all problems listed at once. Called from next.config.ts. */
export function assertLaunchReady(env: LaunchCheckEnv): void {
  const errors = launchCheckErrors(env);
  if (errors.length === 0) return;
  throw new Error(
    `Launch checks failed (BUILD-PLAN Z2):\n` +
      errors.map((e) => `  • ${e}`).join("\n"),
  );
}
