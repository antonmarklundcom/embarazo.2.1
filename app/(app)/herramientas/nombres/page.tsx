"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, notDeleted, softDelete } from "@/lib/db";
import {
  GENDER_LABELS,
  ORIGIN_LABELS,
  PUBLISHED_NAMES,
  filterNames,
} from "@/lib/seed/names";
import type { BabyName, NameOrigin } from "@/lib/types";

// BUILD-PLAN D2 — the name picker (feature map #21).
//
// The Guaraní names are why this exists. A translated global app ships the same
// Sofía/Mateo list in every country; Arami ("un pedacito de cielo"), Yvoty
// ("flor") and Ñasaindy ("luz de luna") with their meanings are something only
// an app built here has — and this is the screen that ends up screenshotted
// into a family WhatsApp group, which is what E2's share card will build on.
//
// Favourites are a synced store, so they survive a new phone. Search matches
// the meaning as well as the name, because somebody usually knows what they
// want a name to mean before they know how it is spelled in Guaraní.

type OriginFilter = NameOrigin | "todos";
type GenderFilter = BabyName["gender"] | "todos";

export default function NombresPage() {
  const [origin, setOrigin] = useState<OriginFilter>("todos");
  const [gender, setGender] = useState<GenderFilter>("todos");
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const favorites = useLiveQuery(
    async () => notDeleted(await db().favoriteNames.toArray()),
    [],
  );
  const favoriteNames = useMemo(
    () => new Set((favorites ?? []).map((row) => row.name)),
    [favorites],
  );

  const results = useMemo(() => {
    const filtered = filterNames(PUBLISHED_NAMES, { origin, gender, query });
    return onlyFavorites ? filtered.filter((n) => favoriteNames.has(n.name)) : filtered;
  }, [origin, gender, query, onlyFavorites, favoriteNames]);

  async function toggle(name: string) {
    const existing = (favorites ?? []).find((row) => row.name === name);
    if (existing?.id) {
      await softDelete("favoriteNames", existing.id);
      return;
    }
    await db().favoriteNames.add({ name, createdAt: Date.now() });
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Nombres</h1>
        <p className="text-sm text-muted">
          Nombres en guaraní, en español y bíblicos, con su significado. Tocá el
          corazón para guardar los que te gustan.
        </p>
      </header>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscá un nombre o un significado (luna, flor…)"
        aria-label="Buscar un nombre o un significado"
        className="w-full rounded-tile border border-line bg-white px-4 py-3 text-sm text-ink"
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(["todos", "guarani", "espanol", "biblico"] as const).map((option) => (
          <FilterChip
            key={option}
            active={origin === option}
            onClick={() => setOrigin(option)}
            label={option === "todos" ? "Todos" : ORIGIN_LABELS[option]}
          />
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(["todos", "f", "m", "u"] as const).map((option) => (
          <FilterChip
            key={option}
            active={gender === option}
            onClick={() => setGender(option)}
            label={option === "todos" ? "Todos" : GENDER_LABELS[option]}
          />
        ))}
        <FilterChip
          active={onlyFavorites}
          onClick={() => setOnlyFavorites((value) => !value)}
          label={`Mis favoritos (${favoriteNames.size})`}
        />
      </div>

      {results.length === 0 ? (
        <p className="rounded-card border border-line bg-white p-4 text-sm text-muted">
          No encontramos nombres con eso. Probá con menos filtros o con otra
          palabra.
        </p>
      ) : (
        <ul className="space-y-2">
          {results.map((entry) => {
            const saved = favoriteNames.has(entry.name);
            return (
              <li
                key={entry.name}
                className="flex items-start gap-3 rounded-card border border-line bg-white p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold text-ink">{entry.name}</p>
                  <p className="mt-0.5 text-sm text-muted">{entry.meaning}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[1.2px] text-petrol">
                    {ORIGIN_LABELS[entry.origin]} · {GENDER_LABELS[entry.gender]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggle(entry.name)}
                  aria-pressed={saved}
                  aria-label={
                    saved ? `Quitar ${entry.name} de favoritos` : `Guardar ${entry.name}`
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pastel-arena/50 text-lg"
                >
                  <span aria-hidden>{saved ? "♥" : "♡"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
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
      className={`min-h-[36px] shrink-0 rounded-tile px-3.5 text-[13px] font-extrabold transition ${
        active ? "bg-pastel-lavanda text-ink" : "bg-pastel-arena/50 text-muted"
      }`}
    >
      {label}
    </button>
  );
}
