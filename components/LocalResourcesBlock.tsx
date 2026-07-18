"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdPlacement, Trimester } from "@/lib/types";
import { SponsoredBadge } from "./SponsoredBadge";
import { WhatsAppButton } from "./WhatsAppButton";

// Shows ≤3 placements from /api/v1/placements using ONLY derived trimester +
// stored department (build spec §6). Renders nothing on failure.
async function fetchPlacements(
  trimester: Trimester,
  department: string,
): Promise<AdPlacement[]> {
  const res = await fetch(
    `/api/v1/placements?trimester=${trimester}&department=${department}`,
  );
  if (!res.ok) throw new Error("failed");
  const data = (await res.json()) as { placements: AdPlacement[] };
  return data.placements;
}

export function LocalResourcesBlock({
  trimester,
  department,
  week,
}: {
  trimester: Trimester;
  department: string;
  week: number;
}) {
  const { data } = useQuery({
    queryKey: ["placements", trimester, department],
    queryFn: () => fetchPlacements(trimester, department),
  });

  const placements = (data ?? []).slice(0, 3);
  if (placements.length === 0) return null;

  return (
    <section aria-labelledby="recursos" className="space-y-3">
      <h2 id="recursos" className="text-sm font-extrabold text-ink">
        Cerca tuyo
      </h2>
      <div className="space-y-3">
        {placements.map((p) => (
          <article
            key={p.id}
            className="rounded-card bg-white p-4 shadow-soft"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">{p.sponsorName}</span>
              <SponsoredBadge />
            </div>
            <h3 className="text-base font-extrabold text-ink">
              {p.headline}
            </h3>
            <p className="mt-1 text-sm text-muted">{p.body}</p>
            {p.offerTag && (
              <span className="mt-2 inline-block rounded-full bg-rose/15 px-2.5 py-0.5 text-xs font-medium text-terracotta">
                {p.offerTag}
              </span>
            )}
            <div className="mt-3">
              <WhatsAppButton
                href={`/api/v1/go/${p.id}?trimester=${trimester}&department=${department}&week=${week}`}
                label={p.ctaLabel}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
