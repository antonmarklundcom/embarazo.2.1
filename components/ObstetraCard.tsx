"use client";

import { obstetraNote } from "@/lib/seed/obstetraNotes";
import { isPlaceholderReviewer } from "@/lib/launchChecks";

// BUILD-PLAN C5 — "de la obstetra" (feature map #14).
//
// One bylined note per week, tied to `NEXT_PUBLIC_MEDICAL_REVIEWER`.
//
// **The byline is the gate, not a decoration.** With no configured reviewer
// this card does not render — not with a generic "el equipo médico", not
// unsigned. That is Z2's rule, and it matters more here than anywhere else in
// the app: this is the one block whose whole value is that a named
// gineco-obstetra stands behind the sentence. An unsigned version of it would
// be the app claiming authority it does not have, on prenatal advice.
//
// The env var is read at module scope, like `MedicalReviewByline` does, so it
// is inlined at build time and the card's existence is decided by the build
// rather than by a runtime check a future refactor could skip.

const REVIEWER = process.env.NEXT_PUBLIC_MEDICAL_REVIEWER;

export function ObstetraCard({ week }: { week: number }) {
  if (isPlaceholderReviewer(REVIEWER)) return null;

  const note = obstetraNote(week);
  if (!note) return null;

  return (
    <section
      aria-labelledby="de-la-obstetra"
      className="rounded-card border border-line bg-pastel-celeste/40 p-4"
    >
      <h2
        id="de-la-obstetra"
        className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
      >
        De la obstetra
      </h2>
      <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">{note}</p>
      <p className="mt-2 text-xs text-muted">{REVIEWER}</p>
    </section>
  );
}
