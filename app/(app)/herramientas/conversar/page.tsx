"use client";

import { useEffect, useState } from "react";

import type { ConversationTheme } from "@/lib/content/schemas";
import { readTalked, toggleTalked, writeTalked } from "@/lib/conversar";
import {
  CONVERSAR_COPY as COPY,
  CONVERSAR_THEME_CHIPS,
  CONVERSAR_THEME_LABELS,
} from "@/lib/i18n/es-PY/conversar";
import { CONVERSATION_THEMES_IN_USE, conversationCards } from "@/lib/seed/shared/conversationCards";
import { partnerWhatsAppUrl } from "@/lib/share/partner";

// "Para conversar": one question card at a time, for her and whoever
// accompanies her. The cards are fixed content (lib/seed/shared/); the only
// state is which ones were marked "Ya lo hablamos", kept on this device
// (`lib/conversar.ts`). Sharing reuses the wa.me link of the partner share
// (`lib/share/partner.ts`): no number, WhatsApp opens its own contact picker.

const THEME_TONE: Record<ConversationTheme, string> = {
  casa: "bg-pastel-salvia",
  reparto: "bg-pastel-celeste",
  plata: "bg-pastel-arena",
  visitas: "bg-pastel-lavanda",
  ilusiones: "bg-pastel-rosa",
  criar: "bg-pastel-salvia",
};

export default function ConversarPage() {
  const [theme, setTheme] = useState<ConversationTheme | null>(null);
  const [index, setIndex] = useState(0);
  const [talked, setTalked] = useState<string[]>([]);

  useEffect(() => {
    setTalked(readTalked());
  }, []);

  const cards = conversationCards(theme);
  const card = cards[Math.min(index, cards.length - 1)];
  const talkedHere = cards.filter((c) => talked.includes(c.id)).length;

  function pickTheme(next: ConversationTheme | null) {
    setTheme(next);
    setIndex(0);
  }

  function onToggle(id: string) {
    const next = toggleTalked(talked, id);
    setTalked(next);
    writeTalked(next);
  }

  if (!card) return null;
  const isTalked = talked.includes(card.id);
  const position = Math.min(index, cards.length - 1);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">{COPY.title}</h1>
        <p className="text-sm text-muted">{COPY.subtitle}</p>
      </header>

      <div role="group" aria-label={COPY.filterLabel} className="flex flex-wrap gap-2">
        <ThemeChip active={theme === null} onClick={() => pickTheme(null)} label={COPY.allThemes} />
        {CONVERSATION_THEMES_IN_USE.map((id) => (
          <ThemeChip
            key={id}
            active={theme === id}
            onClick={() => pickTheme(id)}
            label={CONVERSAR_THEME_CHIPS[id]}
          />
        ))}
      </div>

      <section
        aria-live="polite"
        aria-labelledby="conversar-pregunta"
        className={`flex min-h-[260px] flex-col rounded-card p-5 shadow-soft ${THEME_TONE[card.theme]}`}
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          {CONVERSAR_THEME_LABELS[card.theme]}
        </p>
        <p
          id="conversar-pregunta"
          data-card-id={card.id}
          className="mt-3 flex-1 text-[22px] font-black leading-snug text-ink"
        >
          {card.text}
        </p>
        <button
          type="button"
          aria-pressed={isTalked}
          onClick={() => onToggle(card.id)}
          className={`mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-tile px-4 text-sm font-extrabold transition active:scale-[0.99] ${
            isTalked ? "bg-petrol text-white" : "border border-line bg-white text-petrol"
          }`}
        >
          <span
            aria-hidden
            className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
              isTalked ? "border-white bg-white text-petrol" : "border-ink/20 bg-white"
            }`}
          >
            {isTalked ? "✓" : ""}
          </span>
          {COPY.talked}
        </button>
      </section>

      <div className="flex items-center justify-between text-sm font-bold text-muted">
        <span>{COPY.position(position + 1, cards.length)}</span>
        <span>{COPY.talkedCount(talkedHere)}</span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={position === 0}
          onClick={() => setIndex(position - 1)}
          className="min-h-[44px] flex-1 rounded-tile bg-cream px-4 text-sm font-extrabold text-petrol disabled:opacity-50"
        >
          {COPY.previous}
        </button>
        <button
          type="button"
          disabled={position >= cards.length - 1}
          onClick={() => setIndex(position + 1)}
          className="min-h-[44px] flex-1 rounded-tile bg-petrol px-4 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {COPY.next}
        </button>
      </div>

      <a
        href={partnerWhatsAppUrl(card.text)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[44px] w-full items-center justify-center rounded-tile border border-line bg-white px-4 text-sm font-extrabold text-petrol transition active:scale-[0.99]"
      >
        {COPY.share}
      </a>

      <p className="text-center text-[11px] text-muted">{COPY.privacy}</p>
    </div>
  );
}

function ThemeChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[36px] rounded-tile px-3.5 text-[13px] font-extrabold transition ${
        active ? "bg-pastel-lavanda text-ink" : "bg-pastel-arena/50 text-muted"
      }`}
    >
      {label}
    </button>
  );
}
