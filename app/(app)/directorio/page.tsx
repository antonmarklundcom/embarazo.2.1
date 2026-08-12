"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/lib/useProfile";
import { DEPARTMENTS } from "@/lib/departments";
import {
  DIRECTORY_CATEGORIES,
  directoryCategoryLabel,
} from "@/lib/directoryCategories";
import type { DirectoryCategory, DirectoryListing } from "@/lib/types";
import { SponsoredBadge } from "@/components/SponsoredBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";

const BUSINESS_WA = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "+595000000000";

// "Todos" + every broadened category (build spec §6).
type CategoryFilter = "todos" | DirectoryCategory;

async function fetchDirectory(
  department: string,
  category: CategoryFilter,
  q: string,
): Promise<DirectoryListing[]> {
  const params = new URLSearchParams({ department });
  if (category !== "todos") params.set("category", category);
  if (q) params.set("q", q);
  const res = await fetch(`/api/v1/directory?${params.toString()}`);
  if (!res.ok) throw new Error("failed");
  const data = (await res.json()) as { listings: DirectoryListing[] };
  return data.listings;
}

export default function CercaTuyoPage() {
  const profile = useProfile();
  const [department, setDepartment] = useState("capital");
  const [category, setCategory] = useState<CategoryFilter>("todos");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Default to stored department once it loads.
  useEffect(() => {
    if (profile.department) setDepartment(profile.department);
  }, [profile.department]);

  // Debounce search (300ms, build spec §6).
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["directory", department, category, debounced],
    queryFn: () => fetchDirectory(department, category, debounced),
  });

  // Memoized so its reference is stable when `data` is undefined — otherwise
  // `data ?? []` creates a new array every render and defeats the `grouped`
  // useMemo below.
  const listings = useMemo(() => data ?? [], [data]);

  // When "Todos" is selected, group by category for a clean, scannable list.
  const grouped = useMemo(() => {
    const map = new Map<DirectoryCategory, DirectoryListing[]>();
    for (const l of listings) {
      const arr = map.get(l.category) ?? [];
      arr.push(l);
      map.set(l.category, arr);
    }
    // Preserve the canonical category order.
    return DIRECTORY_CATEGORIES.map((c) => c.key)
      .filter((k) => map.has(k))
      .map((k) => [k, map.get(k)!] as const);
  }, [listings]);

  const businessWa = useMemo(
    () =>
      `https://wa.me/${BUSINESS_WA.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
        "Hola! Estoy usando Mi Bebé y me gustaría recomendar o consultar por un lugar en mi zona.",
      )}`,
    [],
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Cerca tuyo</h1>
        <p className="text-sm text-muted">
          Sanatorios, obstetras, ecografías, pediatras, lactancia, farmacias y
          más, por departamento.
        </p>
      </header>

      {/* Eventos lives inside Cerca tuyo rather than its own nav tab (D4). */}
      <Link
        href="/eventos"
        className="block rounded-card bg-pastel-lavanda p-4 transition active:scale-[0.99]"
      >
        <span className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Eventos
        </span>
        <h2 className="mt-1 text-base font-extrabold text-ink">
          Charlas, talleres y encuentros
        </h2>
        <p className="mt-1 text-sm font-semibold text-ink/70">
          Para embarazadas y mamás, por departamento.
        </p>
      </Link>

      {/* Scrollable category chips */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2 pb-1">
          <CategoryChip
            label="Todos"
            active={category === "todos"}
            onClick={() => setCategory("todos")}
          />
          {DIRECTORY_CATEGORIES.map((c) => (
            <CategoryChip
              key={c.key}
              label={c.label}
              active={category === c.key}
              onClick={() => setCategory(c.key)}
            />
          ))}
        </div>
      </div>

      {/* Department + search */}
      <select
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        aria-label="Departamento"
        className="min-h-[44px] w-full rounded-tile border border-black/10 bg-white px-3 text-sm focus:border-petrol focus:outline-none"
      >
        {DEPARTMENTS.map((d) => (
          <option key={d.slug} value={d.slug}>
            {d.name}
          </option>
        ))}
      </select>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o ciudad"
        className="min-h-[44px] w-full rounded-tile border border-black/10 bg-white px-3 text-sm focus:border-petrol focus:outline-none"
      />

      {isLoading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-card bg-black/5" />
          ))}
        </div>
      )}

      {!isLoading && (isError || listings.length === 0) && (
        <div className="rounded-card bg-white p-5 text-center shadow-soft">
          <p className="text-sm text-ink">
            Todavía no tenemos lugares cargados para esta búsqueda.
          </p>
          <p className="mt-1 text-sm text-muted">
            Estamos armando el directorio con lugares reales y confirmados, uno
            por uno. ¿Conocés uno que debería estar? Contanos.
          </p>
          <div className="mt-3 flex justify-center">
            <WhatsAppButton href={businessWa} label="Escribinos por WhatsApp" />
          </div>
        </div>
      )}

      {/* Grouped list (build spec §6 — clean list grouped by category). */}
      <div className="space-y-5">
        {grouped.map(([cat, items]) => (
          <section key={cat} className="space-y-3">
            {category === "todos" && (
              <h2 className="text-sm font-extrabold text-ink">
                {directoryCategoryLabel(cat)}
              </h2>
            )}
            {items.map((l) => (
              <ListingCard key={l.id} listing={l} department={department} />
            ))}
          </section>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Las listas pueden incluir lugares patrocinados, siempre señalados como
        “Patrocinado”. La información es referencial.
      </p>
    </div>
  );
}

function CategoryChip({
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

function ListingCard({
  listing: l,
  department,
}: {
  listing: DirectoryListing;
  department: string;
}) {
  return (
    <article className="rounded-card bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-extrabold text-ink">{l.name}</h3>
          <p className="text-sm text-muted">{l.city}</p>
        </div>
        {l.isSponsored && <SponsoredBadge />}
      </div>
      {l.address && <p className="mt-1 text-xs text-muted">{l.address}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <WhatsAppButton
          href={`/api/v1/go/${l.id}?department=${department}`}
          label="WhatsApp"
        />
        {l.mapsUrl && (
          <a
            href={l.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol"
          >
            Cómo llegar
          </a>
        )}
      </div>
    </article>
  );
}
