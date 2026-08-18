"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { db, notDeleted } from "@/lib/db";
import { findInsights } from "@/lib/insights/patterns";
import { insightTemplate, renderInsight } from "@/lib/seed/insights";
import { isPlaceholderReviewer } from "@/lib/launchChecks";

// BUILD-PLAN K9 / F3 — one observation about what she has been logging.
//
// **The byline is the gate**, exactly as it is for C5's obstetra card, and for
// a sharper reason: this block says something about a specific person's
// symptoms. Unsigned, it would be the app volunteering an interpretation of
// somebody's body with nobody's name on the phrasing. With no configured
// reviewer it does not render — not generically, not unsigned.
//
// Everything below the gate is on-device arithmetic over rows she already has.
// Nothing is fetched, nothing is sent, and the card renders nothing at all
// until there is enough data for a finding to be honest (see
// `lib/insights/patterns.ts` for the thresholds and why they are blunt).

const REVIEWER = process.env.NEXT_PUBLIC_MEDICAL_REVIEWER;

export function SymptomInsight() {
  const data = useLiveQuery(async () => {
    const [entries, nights] = await Promise.all([
      db().journalEntries.toArray(),
      db().sleepEntries.toArray(),
    ]);
    return {
      entries: notDeleted(entries),
      nights: notDeleted(nights),
    };
  }, []);

  if (isPlaceholderReviewer(REVIEWER)) return null;
  if (!data) return null;

  const insights = findInsights(
    data.entries.map((entry) => ({
      createdAt: entry.createdAt,
      mood: entry.mood,
      // Notes are never read here — encrypted or not, they are not part of
      // any finding and there is no reason for this card to touch them.
      symptoms: entry.symptoms ?? [],
    })),
    data.nights.map((night) => ({ date: night.date, quality: night.quality })),
  );

  // Silence is the default, and it is not a failure state. No "todavía no
  // encontramos patrones" box: it would turn every quiet week into a small
  // report that the app looked and found nothing.
  const first = insights[0];
  if (!first) return null;

  const template = insightTemplate(first.templateId);
  if (!template) return null;

  const rendered = renderInsight(template, {
    symptom: first.symptom.toLowerCase(),
    withCount: first.withCount,
    withDays: first.withDays,
    withoutCount: first.withoutCount,
    withoutDays: first.withoutDays,
  });
  if (!rendered) return null;

  return (
    <section
      aria-labelledby="patron-sintomas"
      className="rounded-card border border-line bg-pastel-lavanda/40 p-4"
    >
      <h2
        id="patron-sintomas"
        className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol"
      >
        Lo que venís anotando
      </h2>
      <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-ink">
        {rendered.line}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{rendered.hint}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Esto sale de lo que vos anotaste en este teléfono. No es un diagnóstico
        y no reemplaza la consulta. {REVIEWER}
      </p>
    </section>
  );
}
