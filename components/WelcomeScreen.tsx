"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { db } from "@/lib/db";
import { APP_NAME } from "@/lib/brand";
import { editorialImage } from "@/lib/editorialImages";
import { heroTheme } from "@/lib/hero/themes";
import { WelcomeBaby } from "@/components/welcome/WelcomeBaby";

type BenefitIconName = "week" | "calendar" | "share";

const BENEFITS: { text: string; icon: BenefitIconName; tile: string }[] = [
  { text: "Tu embarazo, semana a semana.", icon: "week", tile: "bg-pastel-salvia" },
  { text: "Tus controles y registros, a mano.", icon: "calendar", tile: "bg-pastel-arena" },
  { text: "Compartí solo lo que vos elijas.", icon: "share", tile: "bg-pastel-rosa" },
];

// Hoy's default theme ("halo", lib/hero/themes.ts): the warm glow the week
// render's own lighting already has.
const HALO = heroTheme("halo").background;

function BenefitIcon({ name }: { name: BenefitIconName }) {
  const line = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      {name === "week" && (
        <>
          <circle cx="12" cy="12" r="8.5" {...line} />
          <path d="M12 7.5V12l3 2" {...line} />
        </>
      )}
      {name === "calendar" && (
        <>
          <rect x="4" y="5.5" width="16" height="14" rx="3" {...line} />
          <path d="M8 3.5v4M16 3.5v4M4 10h16M9 14.5l2 2 4-4" {...line} />
        </>
      )}
      {name === "share" && (
        <path d="M12 20s-7-4.3-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.7 12 20 12 20Z" {...line} />
      )}
    </svg>
  );
}

/** Public introduction only: personal tracking still goes through /cuenta. */
export function WelcomeScreen({
  accountHref,
  returningHref = accountHref,
  forceWelcome = false,
}: {
  accountHref: string;
  /** The same sign-in, worded for somebody who already has an account. */
  returningHref?: string;
  forceWelcome?: boolean;
}) {
  const router = useRouter();
  const photo = editorialImage("welcome");

  useEffect(() => {
    if (forceWelcome) return;
    let active = true;
    // The existing binding identifies a returning device. It never grants
    // access or reads the pregnancy. Explicit welcome links stay open.
    void db().syncState.get("default").then((saved) => {
      if (active && saved?.accountId) router.replace(returningHref);
    }).catch(() => {
      // Public reading and account links also work without local storage.
    });
    return () => { active = false; };
  }, [returningHref, forceWelcome, router]);

  return (
    <div className="space-y-6 pb-3">
      {/* Warm full-width hero on the same ground as Hoy's (.hero-bleed + Halo),
          with the week render floating on it. */}
      <section aria-labelledby="welcome-title" className="hero-bleed relative isolate overflow-hidden text-ink">
        <div aria-hidden className="absolute inset-0 -z-10" style={{ background: HALO }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-cream md:hidden" />

        <p className="mx-auto mt-2 flex w-fit items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[12px] font-extrabold uppercase tracking-[1.4px] text-petrol shadow-soft">
          <span aria-hidden className="h-2 w-2 rounded-full bg-petrol" />
          Hecha para Paraguay
        </p>

        <div className="mt-3">
          <WelcomeBaby size={232} alt="Ilustración de un bebé a mitad del embarazo" priority />
        </div>

        <div className="mt-2 text-center">
          <h1 id="welcome-title" className="mx-auto max-w-[15ch] text-[34px] font-black leading-[1.08] tracking-tight text-ink sm:text-[38px]">
            Tu embarazo, con más calma.
          </h1>
          <p className="mx-auto mt-3 max-w-[32ch] text-[16px] font-semibold leading-relaxed text-ink">
            Semana a semana, información y herramientas pensadas para vos.
          </p>
        </div>

        <div className="mx-auto mt-6 max-w-sm space-y-3">
          <Link href={accountHref} className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-petrol px-5 text-[16px] font-extrabold text-white shadow-soft transition hover:bg-petrol-dark active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol motion-reduce:transition-none">
            Empezar mi seguimiento
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/guias" className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-white px-5 text-[15px] font-bold text-petrol shadow-soft transition hover:bg-petrol/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol motion-reduce:transition-none">
            Ver consejos
          </Link>
        </div>
      </section>

      <p className="text-center text-sm font-semibold text-muted">
        ¿Ya usás {APP_NAME}?{" "}
        <Link href={returningHref} className="inline-flex min-h-[44px] items-center font-extrabold text-petrol underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol">
          Ya tengo una cuenta
        </Link>
      </p>

      <section className="rounded-card border border-line bg-white p-5 shadow-soft">
        <h2 className="text-[17px] font-black tracking-tight text-ink">Todo en un solo lugar</h2>
        <ul aria-label={`Lo que podés hacer con ${APP_NAME}`} className="mt-4 space-y-3.5">
          {BENEFITS.map((benefit) => (
            <li key={benefit.text} className="flex items-center gap-3.5 text-[15px] font-semibold leading-snug text-ink">
              <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-petrol ${benefit.tile}`}>
                <BenefitIcon name={benefit.icon} />
              </span>
              <span>{benefit.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {photo && (
        <figure className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
          <picture>
            <source type="image/avif" srcSet={photo.avifSrcSet} sizes="(max-width: 448px) calc(100vw - 40px), 704px" />
            <source type="image/webp" srcSet={photo.srcSet} sizes="(max-width: 448px) calc(100vw - 40px), 704px" />
            <img
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              loading="lazy"
              decoding="async"
              className="aspect-[16/9] w-full object-cover"
            />
          </picture>
          <figcaption className="px-4 py-3 text-sm font-semibold leading-relaxed text-muted">
            Guías y herramientas pensadas para el embarazo en Paraguay.
          </figcaption>
        </figure>
      )}

      <p className="px-2 text-center text-xs leading-relaxed text-muted">
        Para tu seguimiento personal necesitás una cuenta. Los consejos y la información de emergencia son públicos.
      </p>
    </div>
  );
}
