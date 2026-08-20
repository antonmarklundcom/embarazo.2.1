"use client";

import { useEffect, useRef } from "react";

import { groupCheers } from "@/lib/sharing/cheers";
import { markCheersSeen, type ReceivedCheer } from "@/lib/sharing/client";

// BUILD-PLAN K2 — what she sees when somebody sends ánimo.
//
// The card renders nothing at all when nobody has cheered. An empty
// "todavía nadie te mandó ánimo" box on a pregnant user's home screen is a
// small unkindness the app can simply not commit.
//
// Repeats collapse: twelve "❤️ Te quiero" is one line with a count, not twelve
// cards. A home screen is not a notification feed, and the feeling the feature
// is for survives grouping — the number is part of it.

function relative(ms: number, now: number): string {
  const days = Math.floor((now - ms) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Date(ms).toLocaleDateString("es-PY", { day: "numeric", month: "long" });
}

export function CheersCard({ cheers }: { cheers: ReceivedCheer[] }) {
  const acknowledged = useRef(false);

  const unseen = cheers.filter((cheer) => cheer.seenAt === null).length;

  useEffect(() => {
    // Acknowledge once per mount, and only when there is something to
    // acknowledge — otherwise every home render posts a write.
    if (acknowledged.current || unseen === 0) return;
    acknowledged.current = true;
    void markCheersSeen();
  }, [unseen]);

  if (cheers.length === 0) return null;

  const grouped = groupCheers(cheers);
  if (grouped.length === 0) return null;

  const now = Date.now();

  return (
    <section
      aria-label="Ánimos de tu familia"
      className="rounded-card border border-line bg-pastel-rosa p-4"
    >
      <h2 className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Tu familia te manda
      </h2>
      <ul className="mt-2.5 space-y-2">
        {grouped.map(({ cheer, count, latestAt }) => (
          <li key={cheer.id} className="flex items-start gap-3">
            <span aria-hidden className="text-xl leading-none">
              {cheer.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-extrabold leading-snug text-ink">
                {cheer.text.es}
                {count > 1 && (
                  <span className="ml-1.5 font-black text-petrol">×{count}</span>
                )}
              </p>
              {cheer.text.gn && (
                <p lang="gn" className="text-sm font-semibold italic text-ink/70">
                  {cheer.text.gn}
                </p>
              )}
              <p className="text-xs text-muted">{relative(latestAt, now)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
