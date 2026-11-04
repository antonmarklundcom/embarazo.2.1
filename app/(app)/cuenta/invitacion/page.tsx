import type { Metadata } from "next";
import Link from "next/link";

import { InviteLanding } from "@/components/InviteLanding";
import { getWeek, hasSizeComparison } from "@/lib/weeks";
import { hasWeekArt, weekArtSrc } from "@/lib/hero/weekArt";
import { APP_NAME } from "@/lib/brand";

// Night run item 1 — the public page a family invitation link opens.
//
// `/familia` needs an account, so a WhatsApp invitation used to drop its
// recipient on a sign-in screen with no explanation. This page opens without
// one: it says what accepting means, shows what a week looks like in the app,
// and only then sends them to sign in, carrying the code (`InviteLanding`).
//
// It never looks the code up. Asking the server "whose code is this?" before
// sign-in would tell anyone holding a forwarded link about somebody's
// pregnancy, so the week shown is a sample week from the public content, the
// same page anyone can open — never hers.

export const metadata: Metadata = {
  title: "Te invitaron a acompañar un embarazo",
  description: `Una invitación para seguir un embarazo en ${APP_NAME}, la app de embarazo hecha para Paraguay.`,
  // The URL carries a single-use code; there is nothing here to index.
  robots: { index: false, follow: false },
};

/** A mid-pregnancy week as the sample: it has a size, a picture and a milestone. */
const SAMPLE_WEEK = 20;

export default function InvitacionPage() {
  const info = getWeek(SAMPLE_WEEK);
  const size = hasSizeComparison(info.sizeComparison) ? info.sizeComparison : null;
  return (
    <div className="space-y-5">
      <header className="px-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
          Invitación
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
          Te invitaron a acompañar un embarazo
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">
          Alguien que confía en vos quiere que sigas su embarazo en {APP_NAME}, la app
          de embarazo hecha para Paraguay. Es gratis.
        </p>
      </header>

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-base font-extrabold text-ink">Qué vas a ver</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-ink">
          <li>En qué semana está y qué está pasando esa semana.</li>
          <li>La fecha probable de parto y el próximo control, si ella los comparte.</li>
          <li>Consejos pensados para la pareja y la familia, semana a semana.</li>
        </ul>
        <p className="mt-3 text-sm text-muted">
          Ella decide qué compartir y puede quitarte el acceso cuando quiera. Para
          aceptar necesitás entrar con tu cuenta: así la invitación queda solo con vos.
        </p>
      </section>

      <InviteLanding />

      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-base font-extrabold text-ink">Así se ve una semana</h2>
        <div className="mt-3 flex items-center gap-4">
          {hasWeekArt(SAMPLE_WEEK) && (
            // eslint-disable-next-line @next/next/no-img-element -- same static week art the week page uses
            <img
              src={weekArtSrc(SAMPLE_WEEK)}
              alt=""
              width={96}
              height={96}
              className="h-24 w-24 shrink-0 object-contain"
            />
          )}
          <div>
            <p className="text-sm font-extrabold text-ink">Semana {SAMPLE_WEEK}</p>
            {size && <p className="text-sm text-muted">Del tamaño de {size}.</p>}
            <p className="mt-1 text-sm leading-relaxed text-ink">{info.milestone}</p>
          </div>
        </div>
        <Link
          href={`/semana/${SAMPLE_WEEK}`}
          className="mt-3 inline-flex min-h-[44px] items-center text-sm font-bold text-petrol underline underline-offset-4"
        >
          Ver la semana {SAMPLE_WEEK} completa
        </Link>
        <p className="mt-1 text-xs text-muted">Es una semana de ejemplo, no la de ella.</p>
      </section>
    </div>
  );
}
