import type { Metadata } from "next";

import { ResetPasswordCard } from "@/components/PasswordResetCards";
import { isAuthAvailable } from "@/lib/server/auth";

// Password reset, step 2 — choose the new password.
//
// `force-dynamic`, and `robots: noindex` below, both matter more here than on
// any other page in the app: the URL carries a live credential in its query
// string. A cached or indexed copy of this page would be a copy of somebody's
// reset link. `PRIVATE_NAVIGATION` in `app/sw.ts` (`/^\/(admin|familia|cuenta|ajustes)(\/|$)/`)
// already keeps the service worker's `defaultCache` off it.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Elegí una nueva contraseña",
  description: "Terminá de cambiar la contraseña de tu cuenta.",
  robots: { index: false, follow: false },
};

export default async function RestablecerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).token;
  // A repeated `?token=a&token=b` arrives as an array. Take the first and let
  // the server action reject it if it is not a real token, rather than guessing
  // which one the user meant.
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const available = isAuthAvailable();

  // The token is handed to the client component to ride in a hidden field, and
  // that is the only thing done with it here: it is not rendered as text, not
  // put in a link, and not logged. The page does no database work at all — the
  // token is only ever looked up when the form is submitted, so merely opening
  // the link (which every mail scanner and link preview bot in the chain will
  // do) cannot consume it.
  //
  // `available ? token : ""` is not cosmetic. Anything passed as a prop to a
  // client component is serialized into the RSC flight payload in the page body,
  // so passing it on a branch that renders no form would put the credential in
  // the response for no reason. `e2e/password-reset.spec.ts` found exactly that.
  // Where the form IS rendered the token is in the body by necessity (the hidden
  // field), which is why this page is `force-dynamic` and `noindex` and why
  // `PRIVATE_NAVIGATION` in `app/sw.ts` keeps the service worker off it.
  return (
    <ResetPasswordCard token={available ? token : ""} available={available} />
  );
}
