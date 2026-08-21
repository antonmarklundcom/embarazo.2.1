// Launch-readiness checks run at build time (BUILD-PLAN Z2).
//
// The failure this prevents: shipping a real deployment whose medical byline is
// still a placeholder, or worse, whose byline silently claims review by "el
// equipo médico" when nobody has reviewed anything. For a health app that is a
// credibility and liability problem, and it is exactly the kind of thing that
// slips through because the app looks fine.
//
// Scope: checks fire only when NEXT_PUBLIC_APP_URL is set, which is the signal
// that this build is a configured deployment rather than a local `npm run
// build` or a CI compile check. Set ALLOW_PLACEHOLDER_REVIEWER=1 to override in
// an emergency — deliberately awkward, and it should never live in a deploy
// config.

import { hasDeletionChannel, supportChannels } from "./support";

/** Marker left in `.env.example` and the CI placeholder value. */
const REVIEWER_PLACEHOLDER_MARKERS = ["___", "placeholder", "tbd"];

export interface LaunchCheckEnv {
  // Index signature so `process.env` (NodeJS.ProcessEnv) is assignable.
  [key: string]: string | undefined;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_MEDICAL_REVIEWER?: string;
  ALLOW_PLACEHOLDER_REVIEWER?: string;
  // The deletion request channels — see the second check below.
  NEXT_PUBLIC_SUPPORT_EMAIL?: string;
  NEXT_PUBLIC_BUSINESS_WHATSAPP?: string;
}

/** True when this build targets a configured deployment. */
export function isDeploymentBuild(env: LaunchCheckEnv): boolean {
  return Boolean(env.NEXT_PUBLIC_APP_URL?.trim());
}

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
  // The override is scoped to the check it names. It used to return early from
  // the whole function, which was fine when there was one check and would have
  // silently disabled the deletion-channel check below — an escape hatch for
  // the medical byline is not consent to ship a broken deletion page.
  const allowPlaceholderReviewer = env.ALLOW_PLACEHOLDER_REVIEWER === "1";
  if (!allowPlaceholderReviewer && isPlaceholderReviewer(env.NEXT_PUBLIC_MEDICAL_REVIEWER)) {
    errors.push(
      "NEXT_PUBLIC_MEDICAL_REVIEWER is unset or still a placeholder. " +
        'Set it to the real reviewer (e.g. "Dra. Pérez, gineco-obstetra") ' +
        "before deploying — the app must not claim medical review it has " +
        "not had. Override with ALLOW_PLACEHOLDER_REVIEWER=1 only if you " +
        "know why you are doing it.",
    );
  }

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
