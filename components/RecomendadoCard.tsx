import type { Recommendation } from "@/lib/content/schemas";
import { SponsoredBadge } from "@/components/SponsoredBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";

// U3 — one card for the Recomendados rail and the /recomendados page. Same
// language as the directory's ListingCard: pastel surface, one CTA, the
// sponsored disclosure only when it applies (nothing seeded today is
// sponsored — see docs/HANDOFF-2026-09-06.md §2).
//
// Every tap goes through /api/v1/go/[id], whether the recomendado carries a
// WhatsApp number or a plain url, so /admin/patrocinios counts it the same
// way a directory or placement click is counted.

// Internal app paths (`/derechos`, `/emergencia`) open in the same tab. The
// href still goes through /api/v1/go/[id], which counts the tap and then
// 302s to the in-app path on this origin, so /admin/patrocinios keeps its
// count without a new tab.
function PlainCta({ href, label, internal }: { href: string; label: string; internal: boolean }) {
  return (
    <a
      href={href}
      {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      className="inline-flex min-h-[44px] items-center justify-center rounded-tile bg-cream px-4 py-2.5 text-sm font-medium text-petrol transition active:scale-[0.98]"
    >
      {label}
    </a>
  );
}

export function RecomendadoCard({ recomendado: r }: { recomendado: Recommendation }) {
  const goHref = `/api/v1/go/${r.id}`;
  const internal = r.url?.startsWith("/") ?? false;

  return (
    <article className="rounded-card bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-extrabold text-ink">{r.title}</h3>
        {r.isSponsored && <SponsoredBadge />}
      </div>
      <p className="mt-1 text-sm text-muted">{r.body}</p>
      {r.priceGs !== undefined && (
        <p className="mt-1 text-sm font-black text-ink">
          {r.priceGs.toLocaleString("es-PY")} ₲
        </p>
      )}
      <div className="mt-3">
        {r.whatsappNumber ? (
          <WhatsAppButton href={goHref} label={r.ctaLabel} />
        ) : (
          <PlainCta href={goHref} label={r.ctaLabel} internal={internal} />
        )}
      </div>
    </article>
  );
}
