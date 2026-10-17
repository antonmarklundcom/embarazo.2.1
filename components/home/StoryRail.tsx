"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import type { Role } from "@/lib/db";
import { storiesForWeek, type Story } from "@/lib/stories";
import { RealisticPicture } from "@/components/RealisticPicture";
import { ToolIcon } from "@/components/ToolIcon";

// Hoy's daily stories (Flo benchmark, 2026-10-17). A row of circles under the
// hero; a tap opens a full-screen viewer she moves through with the
// Anterior/Siguiente buttons, a tap on either side of the card, the arrow keys
// or a swipe. Nothing advances by itself: a timed card takes the text away
// before a slow reader has finished it (WCAG 2.2.1), and on Hoy there is no
// reason to hurry anyone.
//
// Which stories she has opened this week is remembered on this phone only
// (`mibebe.stories.seen`), so the rings can show what is new. It is a
// convenience: if storage is unavailable every ring simply looks new.

const SEEN_KEY = "mibebe.stories.seen";

function readSeen(week: number): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as { week?: number; ids?: unknown }) : null;
    if (parsed?.week === week && Array.isArray(parsed.ids)) return new Set(parsed.ids.filter((id): id is string => typeof id === "string"));
  } catch {
    // Unavailable or malformed storage: nothing seen.
  }
  return new Set();
}

function writeSeen(week: number, ids: Set<string>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify({ week, ids: [...ids] }));
  } catch {
    // Best-effort.
  }
}

export function StoryRail({ week, role }: { week: number; role: Role }) {
  const stories = useMemo(() => storiesForWeek(week, role), [week, role]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [openAt, setOpenAt] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setSeen(readSeen(week));
  }, [week]);

  const markSeen = useCallback(
    (index: number) => {
      const story = stories[index];
      if (!story) return;
      setSeen((previous) => {
        if (previous.has(story.id)) return previous;
        const next = new Set(previous).add(story.id);
        writeSeen(week, next);
        return next;
      });
    },
    [stories, week],
  );

  const close = useCallback(() => {
    setOpenAt(null);
    opener.current?.focus();
  }, []);

  if (stories.length === 0) return null;

  return (
    <section aria-labelledby="historias" className="space-y-2.5">
      <h2 id="historias" className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Tu semana en historias
      </h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="list">
        {stories.map((story, index) => {
          const isSeen = seen.has(story.id);
          return (
            <li key={story.id} className="shrink-0">
              <button
                type="button"
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setOpenAt(index);
                  markSeen(index);
                }}
                aria-label={`${story.label}${isSeen ? " (vista)" : ""}`}
                className="flex w-[72px] flex-col items-center gap-1.5 rounded-tile text-center"
              >
                <span
                  className={`block rounded-full p-[3px] ${isSeen ? "bg-line" : "bg-gradient-to-tr from-terracotta via-petrol to-petrol"}`}
                  aria-hidden
                >
                  <span className="flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-full border-2 border-white bg-cream text-petrol">
                    <StoryThumb story={story} />
                  </span>
                </span>
                <span className="text-[11px] font-bold leading-tight text-ink">{story.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {mounted &&
        openAt !== null &&
        createPortal(
          <StoryViewer
            stories={stories}
            index={openAt}
            onIndex={(next) => {
              setOpenAt(next);
              markSeen(next);
            }}
            onClose={close}
          />,
          document.body,
        )}
    </section>
  );
}

function StoryThumb({ story }: { story: Story }) {
  if (story.image) {
    return (
      <RealisticPicture
        canonicalSrc={story.image.src}
        alt=""
        sizes="62px"
        width={62}
        height={62}
        loading="lazy"
        className="block h-full w-full object-cover"
      />
    );
  }
  return <ToolIcon name={story.icon} size={28} />;
}

function StoryViewer({
  stories,
  index,
  onIndex,
  onClose,
}: {
  stories: Story[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const story = stories[index];
  const panel = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const last = stories.length - 1;

  const previous = useCallback(() => {
    if (index > 0) onIndex(index - 1);
  }, [index, onIndex]);
  const next = useCallback(() => {
    if (index < last) onIndex(index + 1);
    else onClose();
  }, [index, last, onIndex, onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") previous();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, onClose]);

  // Keep the page behind still while the story covers it.
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);

  // Focus moves to each new card so a screen reader announces it.
  useEffect(() => {
    panel.current?.focus();
  }, [index]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-ink/90">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-title"
        aria-describedby="story-position"
        tabIndex={-1}
        className="relative flex h-[100dvh] w-full max-w-md flex-col bg-gradient-to-b from-pastel-arena via-cream to-cream outline-none"
        onTouchStart={(event) => {
          const t = event.touches[0];
          if (!t) return;
          touchStart.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start) return;
          const t = event.changedTouches[0];
          if (!t) return;
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (dy > 90 && Math.abs(dx) < 60) onClose();
          else if (dx < -50 && Math.abs(dy) < 60) next();
          else if (dx > 50 && Math.abs(dy) < 60) previous();
        }}
      >
        <div className="flex gap-1 px-4 pt-[max(env(safe-area-inset-top),12px)]" aria-hidden>
          {stories.map((s, i) => (
            <span key={s.id} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-petrol" : "bg-ink/15"}`} />
          ))}
        </div>
        <div className="flex items-center justify-between px-4 pt-3">
          <p id="story-position" className="text-xs font-bold text-ink/70">
            {story.label} · {index + 1} de {stories.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar historias"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-xl font-black text-ink"
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2">
          {/* Tap zones on either side, as in any story viewer. The buttons
              below are the accessible way to do the same thing. */}
          <div className="absolute inset-y-0 left-0 z-0 w-1/4" onClick={previous} aria-hidden />
          <div className="absolute inset-y-0 right-0 z-0 w-1/4" onClick={next} aria-hidden />

          <div className="relative z-10 mx-auto max-w-sm">
            {story.image ? (
              <div className="mx-auto mt-2 aspect-square w-full max-w-[280px] overflow-hidden rounded-card bg-white shadow-soft">
                <RealisticPicture
                  canonicalSrc={story.image.src}
                  alt={story.image.alt}
                  sizes="280px"
                  className="block h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="mx-auto mt-2 flex h-28 w-28 items-center justify-center rounded-full bg-white text-petrol shadow-soft" aria-hidden>
                <ToolIcon name={story.icon} size={52} />
              </div>
            )}
            <h2 id="story-title" className="mt-6 text-2xl font-black leading-tight tracking-tight text-ink">
              {story.title}
            </h2>
            {story.body.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-base leading-relaxed text-ink/85">
                {paragraph}
              </p>
            ))}
            {story.list && (
              <ul className="mt-3 space-y-2">
                {story.list.map((item) => (
                  <li key={item} className="rounded-tile bg-white/80 p-3 text-sm font-semibold leading-snug text-ink">
                    {item}
                  </li>
                ))}
              </ul>
            )}
            {story.cta && (
              <Link
                href={story.cta.href}
                onClick={onClose}
                className="mt-5 inline-flex min-h-[48px] items-center rounded-full bg-petrol px-5 text-sm font-extrabold text-white"
              >
                {story.cta.label}
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2">
          <button
            type="button"
            onClick={previous}
            disabled={index === 0}
            className="min-h-[48px] rounded-full border border-ink/15 bg-white text-sm font-extrabold text-ink disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={next}
            className="min-h-[48px] rounded-full bg-petrol text-sm font-extrabold text-white"
          >
            {index === last ? "Terminar" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
