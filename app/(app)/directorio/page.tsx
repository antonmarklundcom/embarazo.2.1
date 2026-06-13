"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfile } from "@/lib/useProfile";
import { DEPARTMENTS } from "@/lib/departments";
import type { DirectoryListing } from "@/lib/types";
import { SponsoredBadge } from "@/components/SponsoredBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";

const BUSINESS_WA = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || "+595000000000";

const CATEGORIES = [
  { key: "sanatorio", label: "Sanatorios" },
  { key: "ecografia", label: "Ecografías" },
  { key: "cordon", label: "Cordón" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

async function fetchDirectory(
  department: string,
  category: CategoryKey,
  q: string,
): Promise<DirectoryListing[]> {
  const params = new URLSearchParams({ department, category });
  if (q) params.set("q", q);
  const res = await fetch(`/api/v1/directory?${params.toString()}`);
  if (!res.ok) throw new Error("failed");
  const data = (await res.json()) as { listings: DirectoryListing[] };
  return data.listings;
}

export default function DirectorioPage() {
  const profile = useProfile();
  const [department, setDepartment] = useState("capital");
  const [category, setCategory] = useState<CategoryKey>("sanatorio");
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

  const listings = data ?? [];
  const businessWa = useMemo(
    () =>
      `https://wa.me/${BUSINESS_WA.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
        "Hola! Estoy usando Nido y me gustaría recomendar o consultar por un lugar en mi zona.",
      )}`,
    [],
  );

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-medium text-petrol-dark">Directorio</h1>
        <p className="text-sm text-muted">
          Sanatorios, ecografías y bancos de cordón por departamento.
        </p>
      </header>

      {/* Segmented category control */}
      <div className="flex gap-1 rounded-tile bg-black/5 p-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={`min-h-[40px] flex-1 rounded-[10px] px-2 text-sm font-medium transition ${
              category === c.key ? "bg-white text-petrol shadow-soft" : "text-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Department + search */}
      <div className="flex gap-2">
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          aria-label="Departamento"
          className="min-h-[44px] flex-1 rounded-tile border border-black/10 bg-white px-3 text-sm focus:border-petrol focus:outline-none"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
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
          <p className="text-sm text-muted">
            Todavía no tenemos lugares cargados para esta búsqueda en tu zona.
          </p>
          <div className="mt-3 flex justify-center">
            <WhatsAppButton href={businessWa} label="Escribinos por WhatsApp" />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {listings.map((l) => (
          <article key={l.id} className="rounded-card bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-medium text-ink">{l.name}</h2>
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
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Las listas pueden incluir lugares patrocinados, siempre señalados como
        “Patrocinado”. La información es referencial.
      </p>
    </div>
  );
}
