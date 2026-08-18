"use client";

import {
  ONBOARDING_DRAFT_KEY,
  decodeDraft,
  encodeDraft,
  type OnboardingDraft,
} from "./progress";

// BUILD-PLAN K1 — the only place onboarding touches localStorage.
//
// Every function here swallows its errors. Storage throws in Safari private
// mode and in a locked-down WebView, and an onboarding flow that crashes
// because it could not save a draft would be worse than one that simply does
// not resume: the draft is a convenience, the flow is the product. The cost of
// a failed write is that a sign-in redirect starts the user over, which is
// exactly where they were before K1.

export function readOnboardingDraft(
  now: number = Date.now(),
): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    return decodeDraft(window.localStorage.getItem(ONBOARDING_DRAFT_KEY), now);
  } catch {
    return null;
  }
}

export function writeOnboardingDraft(draft: OnboardingDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_DRAFT_KEY, encodeDraft(draft));
  } catch {
    // Nothing to tell the user: the flow works without the draft.
  }
}

/**
 * Forget the draft.
 *
 * Called when onboarding finishes, and from every path that wipes local data —
 * a restored backup or "borrar todos mis datos" leaves a draft that says the
 * profile was already saved, and resuming into that state would hand somebody
 * an app with no profile row and no step that writes one.
 */
export function clearOnboardingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch {
    // Same reasoning as above.
  }
}

/** Is there an onboarding in progress on this device? */
export function hasOnboardingDraft(now: number = Date.now()): boolean {
  return readOnboardingDraft(now) !== null;
}
