"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { getSession, isAuthAvailable } from "@/lib/server/auth";
import {
  requestVerificationResend,
  verifyEmailToken,
} from "@/lib/server/emailVerification";

// Email verification — the two server actions, in their own file for the same
// reason `./passwordResetActions.ts` is: nothing here shares `./actions.ts`'s
// machinery (no consent cookie to mint, no `SIGN_IN_DESTINATIONS` redirect, no
// `signIn()` throwing NEXT_REDIRECT). Both of these return state and render it
// in place.
//
// Same discipline as every action in `./actions.ts`: a server action is public
// POST surface, so the input is zod-`.strict()`-whitelisted field by field
// (standing rule 4) rather than read straight off the FormData. There is
// deliberately no `redirectTo`/`next`/`callbackUrl` in either schema — the one
// navigation this flow offers is a hard-coded `<Link href="/ajustes">`.
//
// **The token is spent here, never on page load.** `/cuenta/verificar` renders a
// button; the lookup only happens when it is pressed. Every mail scanner, link
// preview bot and antivirus proxy between Resend and the user's thumb will GET
// that URL, and if opening it consumed the token the user would arrive at a dead
// link the machinery had already used up. `restablecer/page.tsx` solved the same
// problem the same way.

const VerifySchema = z
  .object({
    // Not normalised: this is an opaque credential compared by hash, so
    // trimming or lowercasing it would corrupt it. Bounded again in
    // `verifyEmailToken()`; `z.string()` here only asserts it is one.
    token: z.string().min(1).max(512),
  })
  .strict();

export interface VerifyEmailState {
  done?: boolean;
  error?: string;
}

export async function verifyEmailAction(
  _previous: VerifyEmailState,
  formData: FormData,
): Promise<VerifyEmailState> {
  if (!isAuthAvailable()) {
    return {
      error:
        "El ingreso con cuenta no está activo en esta versión, así que no hay correo que confirmar.",
    };
  }

  const parsed = VerifySchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) {
    return {
      error: "Ese enlace es inválido o ya venció. Pedí uno nuevo y volvé a intentar.",
    };
  }

  const result = await verifyEmailToken(parsed.data.token);
  if (result.ok) return { done: true };

  // One message for both `invalid-token` and `expired`. What the person has to
  // do next is identical, and an attacker holding a guessed token learns nothing
  // from "vencido" that "inválido" did not already tell them.
  return {
    error: "Ese enlace es inválido o ya venció. Pedí uno nuevo y volvé a intentar.",
  };
}

/** No fields at all — see `resendVerificationAction` below. */
const ResendSchema = z.object({}).strict();

export interface ResendVerificationState {
  sent?: boolean;
  error?: string;
}

/**
 * "Mandame el enlace de nuevo".
 *
 * Takes no email field on purpose. The address comes from the signed-in
 * session, which makes this action incapable of mailing anybody but the caller —
 * an email parameter here would be a free "send mail from a real domain to an
 * address of my choosing" endpoint, which is a spam relay with extra steps. The
 * cost is that a resend needs a session; someone who cannot sign in at all
 * wants `/cuenta/olvide`, not this.
 */
export async function resendVerificationAction(
  _previous: ResendVerificationState,
  formData: FormData,
): Promise<ResendVerificationState> {
  // An empty `.strict()` whitelist, which is the honest spelling of "this action
  // takes no input". Standing rule 4 applies to an action with no fields too: a
  // caller posting `email=...` or `redirectTo=...` here is rejected rather than
  // having it silently ignored, so the field can never quietly start working.
  //
  // React's own `$ACTION_*` bookkeeping fields are dropped first: they are how a
  // server action still works with JavaScript disabled, they are not input, and
  // they are not something this action gets to have an opinion about.
  const fields = Object.fromEntries(
    [...formData.entries()].filter(([key]) => !key.startsWith("$")),
  );
  if (!ResendSchema.safeParse(fields).success) {
    return { error: "No pudimos procesar el pedido. Recargá la pantalla." };
  }

  if (!isAuthAvailable()) {
    return {
      error:
        "El ingreso con cuenta no está activo en esta versión, así que no hay correo que confirmar.",
    };
  }

  const session = await getSession();
  const email = session?.user?.id ? session.user.email : null;
  if (!email) {
    return {
      error:
        "Entrá a tu cuenta y volvé a esta pantalla para que podamos mandarte el enlace.",
    };
  }

  const result = await requestVerificationResend(email, await headers());
  if (result.ok) return { sent: true };

  switch (result.error) {
    case "rate-limited":
      return { error: "Demasiados intentos. Probá de nuevo en un momento." };
    case "invalid-email":
      return {
        error: "El correo de tu cuenta no es válido. Escribinos y lo arreglamos.",
      };
    case "not-configured":
      // Request-time degradation, not a build-time gate: a deployment without
      // `RESEND_API_KEY` still builds and runs, and says so here instead of
      // pretending a mail went out.
      return {
        error:
          "No podemos enviar correos ahora mismo. Tu cuenta funciona igual: confirmar el correo es opcional.",
      };
    case "send-failed":
      return {
        error: "No pudimos enviar el correo. Intentá de nuevo en un momento.",
      };
  }
}
