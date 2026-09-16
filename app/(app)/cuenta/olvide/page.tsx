import type { Metadata } from "next";

import { ForgotPasswordCard } from "@/components/PasswordResetCards";
import { isAuthAvailable } from "@/lib/server/auth";

// Password reset, step 1 — ask for a link.
//
// `force-dynamic` like `/cuenta`: it renders from env-dependent state and posts
// a server action, and nothing about a recovery screen should be served from a
// build-time snapshot. The service worker already refuses to cache it —
// `PRIVATE_NAVIGATION` in `app/sw.ts` matches `/cuenta/**`.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recuperar tu contraseña",
  description:
    "Pedí un enlace para elegir una contraseña nueva para tu cuenta.",
  // Nothing in this flow belongs in a search index.
  robots: { index: false, follow: false },
};

export default function OlvidePage() {
  return <ForgotPasswordCard available={isAuthAvailable()} />;
}
