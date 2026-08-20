"use client";

import { useState } from "react";

import { purgePrivateCaches } from "@/lib/sw/privateCaches";

// K14 — signing out has to take the cached answers with it.
//
// `signOutAction` is a server action: it clears the session cookie and
// redirects. That was the whole of sign-out before, and it left every private
// response the service worker had already cached sitting on the phone, still
// readable offline by whoever picks it up next. Clearing a cookie is not
// forgetting.
//
// So this wraps the action rather than replacing it: purge first (it cannot
// throw — see `purgePrivateCaches`), then hand off to the server action, which
// still does the only thing that actually ends the session.

export function SignOutButton({ action }: { action: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  return (
    <form
      action={async () => {
        setBusy(true);
        await purgePrivateCaches();
        await action();
      }}
    >
      <button
        type="submit"
        disabled={busy}
        className="mt-3 min-h-[44px] w-full rounded-full bg-cream px-4 py-2.5 text-sm font-extrabold text-petrol transition active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
    </form>
  );
}
