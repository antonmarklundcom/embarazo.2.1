"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { weeklyLine } from "@/lib/seed/weeklyLines";
import { hasSizeComparison } from "@/lib/weeks";
import {
  inNewWeekWindow,
  markWeekSeen,
  newWeekTitle,
  readSeenWeek,
  turnoverWeekday,
} from "@/lib/newWeek";
import { enableWeekStartNotice, readPushState } from "@/lib/push/client";

// "Semana nueva" on Hoy — see `lib/newWeek.ts`.
//
// The weekly habit loop the benchmark apps live on: the day her week turns
// over (her own weekday, from her FUM), Hoy opens with it — the new number,
// the week's one-liner, the size, and one tap to that week's page. The share
// card directly under the hero is the "tell the family" half, so it is not
// repeated here.
//
// It also carries the one natural moment to offer the push that brings her
// back next week: "Tu semana nueva" is off by default (a weekly message
// nobody asked for is how people turn notifications off entirely), so it is
// offered here, on the day it would have arrived, instead of only deep in
// Ajustes.

type OfferState = "hidden" | "offer" | "busy" | "done" | "blocked";

export function NewWeekCard({
  week,
  daysIntoWeek,
  lmpDate,
  sizeComparison,
}: {
  /** Friendly 1-based week, the one /semana/N and the ring use. */
  week: number;
  /** The "+d" of carné notation: 0 on the day the week turns over. */
  daysIntoWeek: number;
  lmpDate: number;
  sizeComparison: string;
}) {
  // Read after mount: localStorage is not there on the server, and a card
  // that flashes in and back out on hydration is worse than one that fades in.
  const [visible, setVisible] = useState(false);
  const [offer, setOffer] = useState<OfferState>("hidden");

  useEffect(() => {
    if (!inNewWeekWindow(daysIntoWeek)) return;
    if (readSeenWeek() === week) return;
    setVisible(true);

    let cancelled = false;
    void readPushState().then((state) => {
      if (cancelled) return;
      const usable = (state.status === "on" || state.status === "off") && !state.needsInstall;
      if (usable && !(state.status === "on" && state.categories.includes("consejos"))) {
        setOffer("offer");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [week, daysIntoWeek]);

  if (!visible || week < 2) return null;

  const weekday = turnoverWeekday(lmpDate);
  const line = weeklyLine(week);

  function dismiss() {
    markWeekSeen(week);
    setVisible(false);
  }

  async function turnOn() {
    setOffer("busy");
    const status = await enableWeekStartNotice();
    setOffer(status === "on" ? "done" : "blocked");
  }

  return (
    <section
      aria-labelledby="semana-nueva"
      className="relative rounded-card border border-petrol/25 bg-pastel-salvia p-4"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-lg text-ink/60"
      >
        ×
      </button>

      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Semana nueva
      </p>
      <h2 id="semana-nueva" className="mt-1 pr-10 text-xl font-black text-ink">
        {newWeekTitle(week, daysIntoWeek)}
      </h2>
      <p className="mt-0.5 text-sm font-semibold text-ink/80">
        Cumpliste {week - 1} {week - 1 === 1 ? "semana" : "semanas"}
        {hasSizeComparison(sizeComparison)
          ? ` y tu bebé ya es del tamaño de ${sizeComparison}.`
          : "."}
      </p>
      {line && <p className="mt-2 text-[15px] leading-relaxed text-ink">{line}</p>}

      <Link
        href={`/semana/${week}`}
        onClick={() => markWeekSeen(week)}
        className="mt-3 flex min-h-[44px] items-center justify-center rounded-tile bg-petrol px-4 text-sm font-extrabold text-white"
      >
        Ver mi semana {week}
      </Link>

      <p className="mt-3 text-xs text-ink/75">
        Tus semanas empiezan cada <strong>{weekday}</strong>, contando desde tu
        fecha.
      </p>

      {offer === "offer" && (
        <button
          type="button"
          onClick={turnOn}
          className="mt-2 min-h-[44px] w-full rounded-tile border border-petrol/30 bg-white px-4 text-sm font-bold text-petrol"
        >
          Avisame cada {weekday} cuando empiece mi semana nueva
        </button>
      )}
      {offer === "busy" && (
        <p className="mt-2 text-xs text-ink/75" aria-live="polite">
          Activando…
        </p>
      )}
      {offer === "done" && (
        <p className="mt-2 text-xs font-semibold text-petrol" aria-live="polite">
          Listo: te avisamos cada {weekday} a las 10.
        </p>
      )}
      {offer === "blocked" && (
        <p className="mt-2 text-xs text-ink/75" aria-live="polite">
          No pudimos activar los avisos. Podés revisarlo en Ajustes.
        </p>
      )}
    </section>
  );
}
