"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useProfile } from "@/lib/useProfile";
import { MAX_WEEK, MIN_WEEK } from "@/lib/pregnancy";

const WEEKS = Array.from({ length: MAX_WEEK - MIN_WEEK + 1 }, (_, i) => MIN_WEEK + i);

/** `/semana`: her week when one is known on this phone, else every week. */
export function WeekIndex() {
  const profile = useProfile();
  const router = useRouter();
  const week = profile.loading ? undefined : profile.week;

  useEffect(() => {
    if (week !== undefined) router.replace(`/semana/${week}`);
  }, [router, week]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-ink">Semana a semana</h1>
        <p className="mt-1 text-sm text-muted">Elegí una semana para ver cómo crece tu bebé.</p>
      </header>
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
