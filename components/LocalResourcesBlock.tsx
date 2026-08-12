"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdPlacement, Trimester } from "@/lib/types";
import { filterPlacements } from "@/lib/directoryFilter";
import { SponsoredBadge } from "./SponsoredBadge";
import { WhatsAppButton } from "./WhatsAppButton";

// Shows ≤3 placements. J3: the request carries NO parameters — trimester is
// derived from the due date (health data) and department is a coarse location,
// and transmitting either costs the app its honest "No data collected" answer
// on the Play listing. The full list comes back and the device filters it.
// Renders nothing on failure.
async function fetchPlacements(): Promise<AdPlacement[]> {
  const res = await fetch("/api/v1/placements");
  if (!res.ok) throw new Error("failed");
  const data = (await res.json()) as { placements: AdPlacement[] };
  return data.placements;
}

/**
 * J3 dropped the `department` and `week` props: nothing here transmits them
 * any more, and a prop that exists only to be ignored invites someone to start
 * sending it again.
 */
export function LocalResourcesBlock({ trimester }: { trimester: Trimester }) {
  // One cache key for everybody: the response no longer varies by user.
  const { data } = useQuery({
    queryKey: ["placements"],
    queryFn: fetchPlacements,
  });

  const placements = filterPlacements(data ?? [], trimester).slice(0, 3);
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
                href={`/api/v1/go/${p.id}`}
                label={p.ctaLabel}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
