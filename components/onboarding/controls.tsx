"use client";

import type { ProviderId } from "@/lib/auth/config";

// K9-F5 — the controls every onboarding step shares.
//
// Extracted from `components/Onboarding.tsx` when that file was split into one
// component per step. Nothing here changed in the move; it is here so that a
// step file can be read on its own screen.

export function PrimaryButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-4 min-h-[44px] w-full rounded-tile bg-petrol px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
    >
      {label}
    </button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 min-h-[44px] w-full text-sm text-muted"
    >
      Volver
    </button>
  );
}

/** The shared field styling, so twelve inputs cannot drift apart. */
export const FIELD_CLASS =
  "min-h-[44px] w-full rounded-tile border border-black/10 bg-cream px-3 py-2 text-ink focus:border-petrol focus:outline-none";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z"
      />
    </svg>
  );
}

export const MARKS: Record<ProviderId, () => React.ReactElement> = {
  google: GoogleMark,
  facebook: FacebookMark,
};

/**
 * A tappable card of choices — the shape onboarding uses for every question
 * with a small, closed set of answers (mode, role, and F5's three).
 */
export function ChoiceCard({
  title,
  desc,
  selected,
  onClick,
}: {
  title: string;
  desc?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected === undefined ? undefined : selected}
      className={`block w-full rounded-card p-5 text-left shadow-soft transition active:scale-[0.99] ${
        selected ? "bg-petrol text-white" : "bg-white text-ink"
      }`}
    >
      <p className="text-base font-extrabold">{title}</p>
      {desc && (
        <p className={`mt-1 text-sm ${selected ? "text-white/75" : "text-muted"}`}>
          {desc}
        </p>
      )}
    </button>
  );
}
