"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, notDeleted } from "@/lib/db";
import { fetchAuthStatus } from "@/lib/auth/status";
import { APP_NAME } from "@/lib/brand";
import {
  dismissAccountNudge,
  isAccountNudgeDismissed,
  shouldShowAccountNudge,
} from "@/lib/accountNudge";

// A real, visible nudge toward creating an account — not a naggy popup on day
// one, and not just the quiet link already on /ajustes (`AccountSection.tsx`)
// and the onboarding account step (`AccountStep.tsx`). ARCHITECTURE.md §4.2
// keeps "seguir sin cuenta" a first-class path; this card exists because that
// path has a real, honest cost — local-only data is gone for good if the
// phone is lost or the app is uninstalled — and once someone has been using
// the app long enough to have something worth losing, saying so plainly is
// respect, not upselling.
//
// Self-gates the same way `RecomendadosRail` does: nothing to show, render
// nothing, no condition needed at the call site. The trigger logic itself
// lives in `lib/accountNudge.ts`, kept pure and unit-tested there.

export function CreateAccountNudge() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authAvailable, setAuthAvailable] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  // `null` means "haven't checked localStorage yet" — distinct from `false`,
  // so the card never flashes on screen for a beat before hiding itself.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchAuthStatus().then((status) => {
      if (!alive) return;
      setAuthAvailable(status.providers.length > 0 || status.credentialsAvailable);
      setHasSession(status.signedIn);
      setAuthChecked(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setDismissed(isAccountNudgeDismissed());
  }, []);

  // Reads only `profile.createdAt` — the cheapest possible signal for "how
  // long has this person been using the app," already on the one row
  // `useProfile` itself reads, no new store and no full-table scan.
  const profileCreatedAt = useLiveQuery(async () => {
    const rows = notDeleted(await db().profile.toArray());
    return rows[0]?.createdAt;
  }, []);

  if (!authChecked || dismissed === null || profileCreatedAt === undefined) {
    return null;
  }
  if (dismissed) return null;
  if (!shouldShowAccountNudge({ profileCreatedAt, hasSession, authAvailable })) {
    return null;
  }

  return (
    <section className="rounded-card border border-line bg-pastel-celeste p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Protegé tu embarazo
      </p>
      <h3 className="mt-1 text-base font-extrabold text-ink">
        Guardá lo que ya registraste
      </h3>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-ink">
        Hace un tiempo que usás {APP_NAME} sin cuenta. Si perdés el teléfono o
        desinstalás la app, esta información no se puede recuperar. Con una
        cuenta gratuita, queda a salvo y la recuperás en cualquier
        dispositivo.
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          href="/cuenta"
          className="flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-terracotta px-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
        >
          Crear cuenta
        </Link>
        <button
          type="button"
          onClick={() => {
            dismissAccountNudge();
            setDismissed(true);
          }}
          className="flex min-h-[44px] items-center justify-center rounded-full border border-line px-4 text-sm font-extrabold text-ink transition active:scale-[0.99]"
        >
          Ahora no
        </button>
      </div>
    </section>
  );
}
