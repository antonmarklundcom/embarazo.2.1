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

/** Marker left in `.env.example` and the CI placeholder value. */
const REVIEWER_PLACEHOLDER_MARKERS = ["___", "placeholder", "tbd"];

export interface LaunchCheckEnv {
  // Index signature so `process.env` (NodeJS.ProcessEnv) is assignable.
  [key: string]: string | undefined;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_MEDICAL_REVIEWER?: string;
  ALLOW_PLACEHOLDER_REVIEWER?: string;
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
  if (env.ALLOW_PLACEHOLDER_REVIEWER === "1") return [];

  const errors: string[] = [];
  if (isPlaceholderReviewer(env.NEXT_PUBLIC_MEDICAL_REVIEWER)) {
    errors.push(
      "NEXT_PUBLIC_MEDICAL_REVIEWER is unset or still a placeholder. " +
        'Set it to the real reviewer (e.g. "Dra. Pérez, gineco-obstetra") ' +
        "before deploying — the app must not claim medical review it has " +
        "not had. Override with ALLOW_PLACEHOLDER_REVIEWER=1 only if you " +
        "know why you are doing it.",
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
