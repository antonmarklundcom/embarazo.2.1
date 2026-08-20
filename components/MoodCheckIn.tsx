"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";

import { db, notDeleted, type Mood, type Role } from "@/lib/db";
import { MOODS } from "@/lib/mood";
import { recordMoodToday } from "@/lib/journal/mood.client";
import { localDay, moodStreak, streakSentence } from "@/lib/journal/streak";
import { moodCheckInLabel } from "@/lib/roleCopy";

// K9-F6 — the home check-in, which now records.
//
// It used to be four faces that navigated to `/herramientas/sintomas`: a
// control that looked like an answer and was a link. The distance between
// "how do you feel" and having said it was a page load, which is most of why
// a daily check-in is a thing people stop doing.
//
// The streak sits under it and is deliberately quiet — nothing at all until
// there is a run of two, and never a word about a run that ended
// (`lib/journal/streak.ts` has the reasoning and the tests).
//
// "Registrar" survives as a secondary link, because a face is not the whole
// journal: symptoms and a note still live on the tool screen.
export function MoodCheckIn({ role, week }: { role: Role; week: number }) {
  const [message, setMessage] = useState("");

  const entries = useLiveQuery(
    () => db().journalEntries.orderBy("createdAt").toArray(),
    [],
  );

  const moods = notDeleted(entries).filter((entry) => entry.mood !== undefined);
  const streak = moodStreak(moods.map((entry) => entry.createdAt));
  const today = moods.find((entry) => localDay(entry.createdAt) === localDay(Date.now()));
  const sentence = streakSentence(streak);

  async function choose(mood: Mood) {
    const result = await recordMoodToday(mood, week);
    setMessage(
      result.ok
        ? result.replaced
          ? "Cambiado. Gracias por contarnos."
          : "Anotado. Gracias por contarnos."
        : "No pudimos guardarlo en este teléfono.",
    );
    setTimeout(() => setMessage(""), 2500);
  }

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-ink">
          {moodCheckInLabel(role)}
        </h3>
        <Link
          href="/herramientas/sintomas"
          className="text-[13px] font-extrabold text-terracotta"
        >
          Registrar
        </Link>
      </div>

      <div className="mt-3.5 flex gap-2">
        {MOODS.map((option) => {
          const selected = today?.mood === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => void choose(option.key)}
              aria-label={option.label}
              aria-pressed={selected}
              className={`flex h-[46px] flex-1 items-center justify-center rounded-xl transition active:scale-95 ${
                option.tone
              } ${selected ? "ring-2 ring-petrol ring-offset-1" : ""}`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#322E29"
                strokeWidth="1.7"
                strokeLinecap="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="9" />
                <path d={option.mouth} />
                <circle cx="9" cy="10" r="0.6" fill="#322E29" />
                <circle cx="15" cy="10" r="0.6" fill="#322E29" />
              </svg>
            </button>
          );
        })}
      </div>

      {message && <p className="mt-2.5 text-[13px] font-semibold text-sage">{message}</p>}
      {sentence && (
        <p className="mt-2.5 text-[13px] font-semibold text-petrol">{sentence}</p>
      )}
    </section>
  );
}
