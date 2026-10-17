"use client";

import { useFlag } from "@/lib/flags/useFlag";

// Growth plan item 19 — the outbound link to the owner's separate baby-name
// site. Behind the `nombres_link` flag (default off) until that site is live.
//
// Split in two so the rule can be tested without a React Query client: the
// wrapper reads the flag, the view decides what is drawn. No tracking
// parameters on purpose — it is a plain link, not a campaign.

export const NOMBRES_URL = "https://nombres.com.py";
export const NOMBRES_LINK_LABEL = "Buscá ideas de nombres en nombres.com.py";

export function NombresLinkView({
  enabled,
  className,
}: {
  enabled: boolean;
  className?: string;
}) {
  if (!enabled) return null;
  return (
    <a
      href={NOMBRES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-medium text-petrol underline ${className ?? ""}`.trim()}
    >
      {NOMBRES_LINK_LABEL}
    </a>
  );
}

/** Renders nothing, and adds no request of its own, while the flag is off. */
export function NombresLink({ className }: { className?: string }) {
  const enabled = useFlag("nombres_link");
  return <NombresLinkView enabled={enabled} className={className} />;
}
