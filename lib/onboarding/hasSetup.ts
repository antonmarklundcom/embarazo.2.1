import type { Profile } from "@/lib/db";
/** Saving an emergency number is not completion of personal onboarding.
 * Existing legacy/companion/planning profiles keep their established setup.
 */
export function hasPersonalSetup(profile: Profile | null | undefined): boolean {
  if (!profile || profile.deletedAt) return false;
  return profile.mode === "embarazada" || profile.mode === "planeando" ||
    typeof profile.role === "string" || typeof profile.department === "string";
}
