"use client";

import { useMemo, useState } from "react";
import { PUBLISHED_VIDEOS } from "@/lib/seed/videos";
import type { VideoItem } from "@/lib/types";
import { MedicalReviewByline } from "@/components/MedicalReviewByline";

type TopicFilter = "todos" | string;
type TrimesterFilter = "todos" | 1 | 2 | 3;

const TRIMESTERS: { value: TrimesterFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: 1, label: "1.º" },
  { value: 2, label: "2.º" },
  { value: 3, label: "3.º" },
];

export default function VideosPage() {
  const [topic, setTopic] = useState<TopicFilter>("todos");
  const [trimester, setTrimester] = useState<TrimesterFilter>("todos");

  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const v of PUBLISHED_VIDEOS) set.add(v.topic);
    return [...set];
  }, []);

  const filtered = useMemo(
    () =>
      PUBLISHED_VIDEOS.filter((v) => {
        const topicOk = topic === "todos" || v.topic === topic;
        // A trimester filter also keeps "general" (0/undefined) videos.
        const trimOk =
          trimester === "todos" ||
          v.trimester === trimester ||
          !v.trimester; // 0 or undefined = general
        return topicOk && trimOk;
      }),
    [topic, trimester],
  );

  if (PUBLISHED_VIDEOS.length === 0) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-black tracking-tight text-ink">Videos</h1>
        </header>
        <div className="rounded-card bg-white p-5 text-center shadow-soft">
          <p className="text-sm text-muted">
            Estamos armando la galería de videos educativos. Volvé pronto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Videos</h1>
        <p className="text-sm text-muted">
          Videos educativos seleccionados sobre el embarazo y los primeros días.
        </p>
      </header>

      {/* Topic chips */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
          <Chip
            label="Todos"
            active={topic === "todos"}
            onClick={() => setTopic("todos")}
          />
          {topics.map((t) => (
            <Chip
              key={t}
              label={t}
              active={topic === t}
              onClick={() => setTopic(t)}
            />
          ))}
        </div>
      </div>

      {/* Trimester chips */}
      <div className="flex gap-2">
        {TRIMESTERS.map((t) => (
          <Chip
            key={String(t.value)}
            label={t.label}
            active={trimester === t.value}
            onClick={() => setTrimester(t.value)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card bg-white p-5 text-center shadow-soft">
          <p className="text-sm text-muted">
            No hay videos para este filtro todavía.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        Los videos se reproducen desde YouTube en modo de privacidad mejorada.
        Son contenido informativo y no reemplazan la atención de un profesional.
      </p>
      <MedicalReviewByline />
    </div>
  );
}

function VideoCard({ video }: { video: VideoItem }) {
  return (
    <article className="overflow-hidden rounded-card bg-white shadow-soft">
      <div className="relative aspect-video w-full bg-black/5">
        <iframe
          loading="lazy"
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
          title={video.title}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs text-ink">
            {video.topic}
          </span>
          {video.trimester ? (
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs text-muted">
              {video.trimester}.º trimestre
            </span>
          ) : null}
          {video.durationLabel && (
            <span className="text-xs text-muted">{video.durationLabel}</span>
          )}
        </div>
        <h2 className="mt-2 text-base font-extrabold text-ink">{video.title}</h2>
        <p className="mt-1 text-sm text-muted">{video.description}</p>
      </div>
    </article>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[40px] shrink-0 rounded-full border px-4 text-sm font-medium transition ${
        active
          ? "border-petrol bg-petrol text-white"
          : "border-black/10 bg-white text-muted"
      }`}
    >
      {label}
    </button>
  );
}
