import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";

import { signOutAction } from "@/app/(app)/cuenta/actions";

// BUILD-PLAN A2 — the signed-in identity, rendered on /ajustes and /cuenta.
//
// Shows exactly what we hold: name, email, avatar (ARCHITECTURE.md §4.7).
// There is nothing else to show, and that is the point.

export function AccountCard({
  session,
  showDeletionNote = false,
}: {
  session: Session;
  showDeletionNote?: boolean;
}) {
  const { name, email, image } = session.user;

  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-soft">
      <p className="text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        Tu cuenta
      </p>
      <div className="mt-2 flex items-center gap-3">
        {image ? (
          <Image
            src={image}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
            // Avatars come from provider CDNs we do not control; skipping the
            // optimizer avoids a remotePatterns allowlist that would have to
            // track Google's hostnames forever.
            unoptimized
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
        Tus fotos no: siguen solo en este teléfono.
      </p>

      <form action={signOutAction}>
        <button
          type="submit"
          className="mt-3 min-h-[44px] w-full rounded-full bg-cream px-4 py-2.5 text-sm font-extrabold text-petrol transition active:scale-[0.99]"
        >
          Cerrar sesión
        </button>
      </form>

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
