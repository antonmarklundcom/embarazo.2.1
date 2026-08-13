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
import { filterDirectory } from "@/lib/directoryFilter";
import { LISTINGS_PER_PAGE, categoryBanners } from "@/lib/directoryBanners";
import { DirectoryBanners } from "@/components/DirectoryBanners";
import { SponsoredBadge } from "@/components/SponsoredBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { businessWhatsApp, waLink } from "@/lib/whatsapp";

// C8: `|| "+595000000000"` used to stand here. With the env var unset — its
// state today — that button opened a chat with nobody, which is the failure Z1
// exists to prevent. `businessWhatsApp` answers null instead, and the button is
// not rendered.
const BUSINESS_WA = businessWhatsApp(process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP);

// "Todos" + every broadened category (build spec §6).
type CategoryFilter = "todos" | DirectoryCategory;

// J3: the request carries NO parameters. `department` is a coarse location and
// Play's Data safety form treats it as one, which would cost the app an honest
// "No data collected" on the store listing (docs/ANDROID-LAUNCH.md §3.1). The
// directory is a few dozen entries and is already precached, so the whole list
// comes back once and the device filters it — the search box and the
// department picker never leave the phone.
async function fetchDirectory(): Promise<DirectoryListing[]> {
  const res = await fetch("/api/v1/directory");
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
  // D5: how many listings each category has been expanded to. Client-side,
  // because J3 left these routes with no parameters at all — see DECISIONS.
  const [shown, setShown] = useState<Record<string, number>>({});

  // Default to stored department once it loads.
  useEffect(() => {
    if (profile.department) setDepartment(profile.department);
  }, [profile.department]);

  // A changed filter means a different list; carrying the old "ver más" count
  // over would drop somebody into the middle of a list she has not scrolled.
  useEffect(() => {
    setShown({});
  }, [department, debounced, category]);

  // Debounce search (300ms, build spec §6).
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // One cache key for everybody: the response no longer varies by user, which
  // also means the service worker's cached copy serves every filter offline.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["directory"],
    queryFn: fetchDirectory,
  });

  // Memoized so its reference is stable when `data` is undefined — otherwise
  // `data ?? []` creates a new array every render and defeats the `grouped`
  // useMemo below.
  // J3: filtering moved here from the server. `filterDirectory` is the exact
  // rule the route used to apply, extracted and unit-tested — moving a filter
  // to the client is only a privacy win if it still filters correctly.
  const listings = useMemo(
    () =>
      filterDirectory(data ?? [], {
        department,
        category,
        q: debounced,
      }),
    [data, department, category, debounced],
  );

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

  // D5: counts are of what she would see if she tapped — after the department
  // and the search, never before.
  const banners = useMemo(() => categoryBanners(listings), [listings]);

  const businessWa = useMemo(
    () =>
      BUSINESS_WA
        ? waLink(
            BUSINESS_WA,
            "Hola! Estoy usando Mi Bebé y me gustaría recomendar o consultar por un lugar en mi zona.",
          )
        : null,
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

      {/* D5: category banners with a real count. Only for "Todos" — once a
          category is chosen the grid would be a one-tile menu of where you
          already are. */}
      {category === "todos" && (
        <DirectoryBanners
          banners={banners}
          onPick={(picked) => {
            setCategory(picked);
            setShown({});
          }}
        />
      )}

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
          {businessWa && (
            <div className="mt-3 flex justify-center">
              <WhatsAppButton href={businessWa} label="Escribinos por WhatsApp" />
            </div>
          )}
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
            {items.slice(0, shown[cat] ?? LISTINGS_PER_PAGE).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
            {items.length > (shown[cat] ?? LISTINGS_PER_PAGE) && (
              <button
                type="button"
                onClick={() =>
                  setShown((current) => ({
                    ...current,
                    [cat]: (current[cat] ?? LISTINGS_PER_PAGE) + LISTINGS_PER_PAGE,
                  }))
                }
                className="min-h-[44px] w-full rounded-tile border border-line bg-white text-sm font-extrabold text-petrol"
              >
                Ver más ({items.length - (shown[cat] ?? LISTINGS_PER_PAGE)} más)
              </button>
            )}
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

/**
 * J3 dropped the `department` prop: the WhatsApp link no longer carries it,
 * and a prop kept only to be ignored invites someone to start sending it
 * again.
 */
function ListingCard({ listing: l }: { listing: DirectoryListing }) {
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
          href={`/api/v1/go/${l.id}`}
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
