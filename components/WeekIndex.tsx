"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { babyAge, babyAgeLabel } from "@/lib/baby/age";
import { useProfile } from "@/lib/useProfile";
import { MAX_WEEK, MIN_WEEK } from "@/lib/pregnancy";

const WEEKS = Array.from({ length: MAX_WEEK - MIN_WEEK + 1 }, (_, i) => MIN_WEEK + i);

/**
 * `/semana`: her week when one is known on this phone, else every week.
 *
 * Once the birth is recorded there is no current pregnancy week any more: the
 * screen opens on the baby's age with a way back to Hoy, and the weeks are
 * offered only as a look-back.
 */
export function WeekIndex() {
  const profile = useProfile();
  const router = useRouter();
  const born = !profile.loading && profile.birthDate !== undefined;
  const week = profile.loading || born ? undefined : profile.week;

  useEffect(() => {
    if (week !== undefined) router.replace(`/semana/${week}`);
  }, [router, week]);

  return (
    <div className="space-y-5">
      {born ? (
        <header className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-ink">
            Tu bebé tiene {babyAgeLabel(babyAge(profile.birthDate!, profile.now))}
          </h1>
          <Link href="/" className="inline-flex min-h-[44px] items-center text-sm font-extrabold text-petrol underline underline-offset-4">
            Volver a Hoy
          </Link>
          <h2 className="pt-2 text-lg font-extrabold text-ink">Tu embarazo, semana a semana</h2>
          <p className="text-sm text-muted">Elegí una semana para recordar cómo crecía tu bebé.</p>
        </header>
      ) : (
        <header>
          <h1 className="text-2xl font-black tracking-tight text-ink">Semana a semana</h1>
          <p className="mt-1 text-sm text-muted">Elegí una semana para ver cómo crece tu bebé.</p>
        </header>
      )}
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {WEEKS.map((n) => (
          <li key={n}>
            <Link
              href={`/semana/${n}`}
              className="flex min-h-12 items-center justify-center rounded-tile border border-line bg-white text-sm font-extrabold text-ink"
            >
              {n}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
