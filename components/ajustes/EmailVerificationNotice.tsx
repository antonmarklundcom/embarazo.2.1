import Link from "next/link";

import { verificationStatusFor } from "@/lib/server/emailVerification";

// The unconfirmed-address nudge on /ajustes, directly under the identity it is
// about.
//
// A nudge, never a block. Confirming is not a condition for anything —
// `authorize()` in `lib/server/auth.ts` does not consult `users.emailVerified`,
// on purpose, because every account created before that feature existed has a
// null there forever. So this card has no warning colour, no exclamation mark
// and no "tenés que": it says what confirming buys (a way back in if she forgets
// her password) and links to the screen that does it.
//
// Renders NOTHING in every other case — confirmed, OAuth-only (which never
// populates the column either, so it would read as unconfirmed forever), no
// database, no row. `verificationStatusFor` makes that decision; see its note.

export async function EmailVerificationNotice({
  userId,
}: {
  userId: string;
}) {
  const { shouldConfirm } = await verificationStatusFor(userId);
  if (!shouldConfirm) return null;

  return (
    <section className="rounded-card border border-line bg-pastel-arena p-4">
      <h2 className="text-[15px] font-extrabold text-sand-text">
        Confirmá tu correo
      </h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-sand-text">
        Te mandamos un enlace cuando creaste tu cuenta. Confirmarlo es opcional y
        todo funciona igual — sirve para que podamos ayudarte a entrar si algún
        día olvidás tu contraseña.
      </p>
      <Link
        href="/cuenta/verificar"
        className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-extrabold text-ink transition active:scale-[0.99]"
      >
        Confirmar mi correo
      </Link>
    </section>
  );
}
