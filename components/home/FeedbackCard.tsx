"use client";

import { useEffect, useState } from "react";
import { waLink } from "@/lib/whatsapp";

// BUILD-PLAN C8 (FEATURE-MAP #19). "¿Cómo te está yendo?"
//
// Preggers asks for a star rating that goes to an app store. We are a PWA with
// no store listing, and during the friends-and-family round what we actually
// need is what people think — so the stars open a pre-filled WhatsApp message
// instead of a review form.
//
// Dismissal is remembered, and the card does not appear on the very first day:
// asking for feedback before someone has used the app is asking them to make
// something up.

const BUSINESS_WA = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "";
const DISMISS_KEY = "mibebe.feedback.dismissed";
const FIRST_SEEN_KEY = "mibebe.feedback.firstSeen";
const MIN_DAYS_BEFORE_ASKING = 2;

export function FeedbackCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!BUSINESS_WA) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;

      const firstSeen = localStorage.getItem(FIRST_SEEN_KEY);
      if (!firstSeen) {
        localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
        return;
      }

      const days = (Date.now() - Number(firstSeen)) / 86_400_000;
      if (days >= MIN_DAYS_BEFORE_ASKING) setVisible(true);
    } catch {
      // Private browsing with storage blocked: just never ask.
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore — hiding it for this session is enough.
    }
    setVisible(false);
  }

  if (!visible) return null;

  function link(rating: number): string {
    return waLink(
      BUSINESS_WA,
      `Hola! Le doy ${rating} de 5 a Mi Bebé. Lo que cambiaría es: `,
    );
  }

  return (
    <section className="rounded-card border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-ink">
            ¿Cómo te está yendo?
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Contanos qué te sirve y qué falta. Lo leemos todo.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="No mostrar más"
          className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-black/5"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((rating) => (
          <a
            key={rating}
            href={link(rating)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            aria-label={`${rating} de 5`}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-tile bg-cream text-xl transition active:scale-95"
          >
            ⭐
          </a>
        ))}
      </div>
    </section>
  );
}
