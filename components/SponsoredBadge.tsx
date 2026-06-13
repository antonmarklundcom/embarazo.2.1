// Mandatory component (build spec §3). Disclosure lives here, never optional
// via data: this ALWAYS renders "Patrocinado".
export function SponsoredBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-sand-bg px-2.5 py-0.5 text-xs font-medium text-sand-text">
      Patrocinado
    </span>
  );
}
