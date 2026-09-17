import type { Metadata } from "next";

import { VerifyEmailCard } from "@/components/EmailVerificationCard";
import { getSession, isAuthAvailable } from "@/lib/server/auth";
import { verificationStatusFor } from "@/lib/server/emailVerification";

// Email verification — the landing page for the link in the confirmation mail.
//
// `force-dynamic`, and `robots: noindex` below, for the same reason
// `restablecer/page.tsx` has them: the URL carries a live token in its query
// string, and a cached or indexed copy of this page would be a copy of
// somebody's link. `PRIVATE_NAVIGATION` in `app/sw.ts`
// (`/^\/(admin|familia|cuenta|ajustes)(\/|$)/`) already keeps the service
// worker's `defaultCache` off it.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirmá tu correo",
  description: "Terminá de confirmar el correo de tu cuenta.",
  robots: { index: false, follow: false },
};

export default async function VerificarPage({
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

  // Read only to decide which of two sentences to show. A signed-out visitor is
  // never told anything about an address: `getSession()` is the only source here,
  // so this page cannot be used to ask about somebody else's account.
  const session = available ? await getSession() : null;
  const userId = session?.user?.id ?? "";
  const verified =
    userId !== "" && (await verificationStatusFor(userId)).verified;

  // The page itself does NO token work: the lookup happens in the server action
  // behind the button, so merely opening the link (which every mail scanner and
  // link-preview bot in the chain will do) cannot consume it.
  //
  // `available ? token : ""` is not cosmetic, and it is the same fix
  // `restablecer/page.tsx` documents: anything passed as a prop to a client
  // component is serialized into the RSC flight payload, so handing it over on a
  // branch that renders no form would put the credential in the response for no
  // reason. Where the form IS rendered the token is in the body by necessity (the
  // hidden field), which is why this page is `force-dynamic` and `noindex`.
  return (
    <VerifyEmailCard
      token={available ? token : ""}
      available={available}
      signedIn={userId !== ""}
      verified={verified}
    />
  );
}
