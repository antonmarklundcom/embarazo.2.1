"use client";

import { approvedObstetraNote } from "@/lib/seed/obstetraNotes";

// BUILD-PLAN C5 — "de la obstetra" (feature map #14).
//
// One bylined note per week.
//
// **The signature is the gate, not a decoration.** Without a reviewer's
// approval of this week's exact text the card does not render — not with a
// generic "el equipo médico", not unsigned. That is Z2's rule, and it matters
// more here than anywhere else in the app: this is the one block whose whole
// value is that a named gineco-obstetra stands behind the sentence. An unsigned
// version of it would be the app claiming authority it does not have, on
// prenatal advice.
//
// F22 (2026-10): the gate used to be `NEXT_PUBLIC_MEDICAL_REVIEWER`, which
// unlocked all 42 notes at once under one name. It is now per week and per
// version (`approvedObstetraNote`, `lib/seed/approvals.json`): approving week
// 20 unlocks week 20, signed by whoever approved it, and editing that note
// hides it again until it is re-approved. The registry is bundled at build
// time, like the variable was, so the card's existence is still decided by
// the build rather than by a runtime fetch.

export function ObstetraCard({ week }: { week: number }) {
  const approved = approvedObstetraNote(week);
  if (!approved) return null;

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
      <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">{approved.note}</p>
      <p className="mt-2 text-xs text-muted">
        {approved.review.reviewerName}, {approved.review.profession}
      </p>
    </section>
  );
}
