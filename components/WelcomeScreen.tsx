"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { db } from "@/lib/db";
import { APP_NAME } from "@/lib/brand";
import { editorialImage } from "@/lib/editorialImages";
import { ThemeBackdrop } from "@/components/hero/ThemeBackdrop";

const BENEFITS = [
  "Tu embarazo, semana a semana.",
  "Tus controles y registros, a mano.",
  "Compartí solo lo que vos elijas.",
];

/** Public introduction only: personal tracking still goes through /cuenta. */
export function WelcomeScreen({
  accountHref,
  forceWelcome = false,
}: {
  accountHref: string;
  forceWelcome?: boolean;
}) {
  const router = useRouter();
  const hero = editorialImage("welcome");

  useEffect(() => {
    if (forceWelcome) return;
    let active = true;
    // The existing binding identifies a returning device. It never grants
    // access or reads the pregnancy. Explicit welcome links stay open.
    void db().syncState.get("default").then((saved) => {
      if (active && saved?.accountId) router.replace(accountHref);
    }).catch(() => {
      // Public reading and account links also work without local storage.
    });
    return () => { active = false; };
  }, [accountHref, forceWelcome, router]);

  return (
    <div className="space-y-6 pb-3">
      <div className="relative overflow-hidden rounded-[28px] bg-pastel-arena">
        {hero ? (
          <picture>
            <source type="image/avif" srcSet={hero.avifSrcSet} sizes="(max-width: 448px) calc(100vw - 32px), 416px" />
            <source type="image/webp" srcSet={hero.srcSet} sizes="(max-width: 448px) calc(100vw - 32px), 416px" />
            <img
              src={hero.src}
              alt={hero.alt}
              width={hero.width}
              height={hero.height}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="aspect-[3/2] w-full object-cover"
            />
          </picture>
        ) : (
          <div className="relative flex aspect-[3/2] items-center justify-center">
            <ThemeBackdrop theme="nanduti" />
            <span className="relative text-3xl font-bold tracking-tight text-petrol">{APP_NAME}</span>
          </div>
        )}
      </div>

      <header className="px-1">
        <p className="text-sm font-semibold text-petrol">Hecha para Paraguay</p>
        <h1 className="mt-2 max-w-[15ch] text-[34px] font-extrabold leading-[1.12] tracking-tight text-ink">
          Tu embarazo, con más calma.
        </h1>
        <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-muted">
          Semana a semana, información y herramientas pensadas para vos.
        </p>
      </header>

      <ul aria-label={`Lo que podés hacer con ${APP_NAME}`} className="space-y-4 px-1">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink">
            <svg className="mt-1 shrink-0 text-petrol" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <Link href={accountHref} className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-petrol px-5 text-[15px] font-extrabold text-white transition hover:bg-petrol-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol">
          Empezar mi seguimiento
        </Link>
        <Link href="/guias" className="flex min-h-[48px] w-full items-center justify-center rounded-full border border-line bg-white px-5 text-[15px] font-bold text-petrol transition hover:bg-petrol/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol">
          Ver consejos
        </Link>
        <p className="pt-1 text-center text-sm text-muted">
          ¿Ya usás {APP_NAME}?{" "}
          <Link href={accountHref} className="inline-flex min-h-[44px] items-center font-bold text-petrol underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol">
            Ya tengo una cuenta
          </Link>
        </p>
        <p className="px-2 text-center text-xs leading-relaxed text-muted">
          Para tu seguimiento personal necesitás una cuenta. Los consejos y la información de emergencia son públicos.
        </p>
      </div>
    </div>
  );
}
