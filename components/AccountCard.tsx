"use client";

import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/app/(app)/cuenta/actions";
import { SignOutButton } from "./SignOutButton";

// BUILD-PLAN A2 — the signed-in identity, rendered on /ajustes and /cuenta.
//
// Shows exactly what we hold: name, email, avatar (ARCHITECTURE.md §4.7).
// There is nothing else to show, and that is the point.
//
// Client component because the avatar needs an onError fallback: a provider
// URL that is present but blocked (CSP, a moved CDN, offline) must show the
// same initial as an absent one.

export function AccountCard({
  session,
  showDeletionNote = false,
}: {
  session: Session;
  showDeletionNote?: boolean;
}) {
  const { name, email, image } = session.user;
  // The URL that failed. Keyed by URL so a different avatar gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // A failure can land before hydration, when React has no onError listener
  // yet. An image that has finished with no pixels has already failed.
  useEffect(() => {
    const img = imgRef.current;
    if (image && img?.complete && img.naturalWidth === 0) setFailedSrc(image);
  }, [image]);

  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-soft">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Tu cuenta
      </p>
      <div className="mt-2 flex items-center gap-3">
        {image && failedSrc !== image ? (
          <Image
            ref={imgRef}
            src={image}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
            // Avatars come from provider CDNs we do not control; skipping the
            // optimizer avoids a remotePatterns allowlist that would have to
            // track Google's hostnames forever.
            unoptimized
            onError={() => setFailedSrc(image)}
          />
        ) : (
          <div
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pastel-rosa text-lg font-black text-ink"
          >
            {(name ?? email ?? "?").trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          {name && (
            <p className="truncate text-[15px] font-extrabold text-ink">
              {name}
            </p>
          )}
          {email && <p className="truncate text-sm text-muted">{email}</p>}
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Tus datos de salud se copian a nuestro servidor para que no los pierdas.
        Tus fotos, solo si activás «Copia de tus fotos». Las notas con PIN no
        se suben.
      </p>

      <SignOutButton action={signOutAction} />

      {showDeletionNote && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Para borrar tu cuenta y todos tus datos del servidor, andá a{" "}
          <Link href="/ajustes" className="font-bold underline">
            Ajustes
          </Link>
          .
        </p>
      )}
    </section>
  );
}
