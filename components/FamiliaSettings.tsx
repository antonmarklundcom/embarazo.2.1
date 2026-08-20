"use client";

import Link from "next/link";
import { useSharedViews, ownerViewOf } from "@/lib/sharing/useSharedViews";

// BUILD-PLAN K7 — the Familia group in Ajustes.
//
// The second of the two routes into `/familia` the plan asks for ("reachable
// in ≤2 taps from Hoy"): the home card is one, this is where somebody who is
// *looking* for it goes. Settings is where users hunt for "who can see my
// stuff", so a sharing feature that is absent from settings is a sharing
// feature people assume they do not have.
//
// It renders for a signed-out user too, and says the true thing rather than
// nothing: the feature exists, and an account is what it needs. Hiding it
// would leave that user unable to discover the reason to make one.

export function FamiliaSettings() {
  const shared = useSharedViews();
  const owner = ownerViewOf(shared.views);
  const companions = (owner?.members ?? []).filter((m) => m.role !== "owner");

  return (
    <section className="rounded-card bg-white p-4 shadow-soft">
      <h2 className="text-base font-extrabold text-ink">Tu familia</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {shared.loading
          ? "Viendo quién sigue tu embarazo…"
          : owner
            ? companions.length === 0
              ? "Todavía no invitaste a nadie. Van a ver tu semana, tu fecha probable de parto y tu próximo control — nada más."
              : `${companions.length} ${companions.length === 1 ? "persona sigue" : "personas siguen"} tu embarazo. Podés sacarle el acceso a cualquiera cuando quieras.`
            : "Con una cuenta podés invitar a tu pareja y a tu familia a seguir tu embarazo, y sacarles el acceso cuando quieras."}
      </p>
      <Link
        href="/familia"
        className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-tile bg-cream px-4 text-sm font-extrabold text-petrol transition active:scale-[0.98]"
      >
        {owner && companions.length > 0 ? "Ver quién ve tu embarazo" : "Invitar a tu familia"}
      </Link>
    </section>
  );
}
