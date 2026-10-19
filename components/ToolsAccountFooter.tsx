"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { signOutAction } from "@/app/(app)/cuenta/actions";
import { fetchAuthStatus } from "@/lib/auth/status";
import { SignOutButton } from "./SignOutButton";

export function ToolsAccountFooter() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchAuthStatus().then((status) => {
      if (active) setSignedIn(status.signedIn);
    });
    return () => { active = false; };
  }, []);

  return (
    <section aria-label="Tu cuenta" className="rounded-card border border-line bg-white p-4 shadow-soft">
      <Link href="/cuenta" className="inline-flex min-h-[44px] items-center text-sm font-extrabold text-petrol underline">
        Mi cuenta
      </Link>
      {signedIn && (
        <>
          <p className="text-xs leading-relaxed text-muted">
            Cerrar sesión no borra tu cuenta ni los datos guardados en ella.
          </p>
          <SignOutButton action={signOutAction} />
        </>
      )}
    </section>
  );
}
